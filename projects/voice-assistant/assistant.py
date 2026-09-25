"""A voice assistant you can talk to.

Loop: record your voice -> ElevenLabs speech-to-text -> Claude writes a reply
-> ElevenLabs text-to-speech -> play it back. The conversation history is kept
so follow-up questions work.

Run:
    python assistant.py          # talk with your microphone
    python assistant.py --text   # type instead of speaking (replies are still spoken)
    python assistant.py --mute   # don't play audio replies (print them only)
"""

import argparse
import io
import os
import sys
import wave

import anthropic
import numpy as np
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

SAMPLE_RATE = 16_000  # Hz, mono 16-bit, used for both recording and playback
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-5")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")  # "George"
TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5")
STT_MODEL = os.getenv("ELEVENLABS_STT_MODEL", "scribe_v1")

SYSTEM_PROMPT = (
    "You are a friendly voice assistant. Your replies are converted to speech, "
    "so answer in plain conversational sentences: no markdown, bullet points, "
    "code blocks, or emoji. Keep answers short (one to three sentences) unless "
    "the user asks for more detail. Latency-sensitive; begin your visible "
    "answer immediately."
)

EXIT_WORDS = {"exit", "quit", "goodbye", "bye", "stop"}


def record_until_enter() -> bytes:
    """Record from the default microphone until Enter is pressed; return WAV bytes."""
    import sounddevice as sd  # imported here so --text mode works without PortAudio

    chunks: list[np.ndarray] = []

    def on_audio(indata, frames, time, status):
        chunks.append(indata.copy())

    input("\n🎙️  Press Enter and start talking...")
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", callback=on_audio):
        input("   Recording - press Enter when you're done.")

    audio = np.concatenate(chunks) if chunks else np.zeros((0, 1), dtype=np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(audio.tobytes())
    return buf.getvalue()


def transcribe(eleven: ElevenLabs, wav_bytes: bytes) -> str:
    buf = io.BytesIO(wav_bytes)
    buf.name = "speech.wav"
    result = eleven.speech_to_text.convert(file=buf, model_id=STT_MODEL)
    return result.text.strip()


def speak(eleven: ElevenLabs, text: str) -> None:
    import sounddevice as sd

    pcm = b"".join(
        eleven.text_to_speech.convert(
            VOICE_ID,
            text=text,
            model_id=TTS_MODEL,
            output_format=f"pcm_{SAMPLE_RATE}",
        )
    )
    sd.play(np.frombuffer(pcm, dtype=np.int16), SAMPLE_RATE)
    sd.wait()


class Brain:
    """Claude-backed reply generation with running conversation history."""

    def __init__(self) -> None:
        self.client = anthropic.Anthropic()
        self.messages: list = []

    def reply(self, user_text: str) -> str:
        self.messages.append({"role": "user", "content": user_text})
        response = self.client.beta.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=self.messages,
            output_config={"effort": "low"},  # quick replies for a live conversation
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",  # retry on a fallback model if a request is declined
        )
        if response.stop_reason == "refusal":
            self.messages.pop()  # drop the turn so the conversation can continue
            return "Sorry, I can't help with that one. Could you ask something else?"

        # Keep the full content (not just the text) so history stays valid.
        self.messages.append({"role": "assistant", "content": response.content})
        return "".join(b.text for b in response.content if b.type == "text").strip()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--text", action="store_true", help="type your messages instead of speaking")
    parser.add_argument("--mute", action="store_true", help="print replies without playing audio")
    args = parser.parse_args()

    missing = [k for k in ("ELEVENLABS_API_KEY", "ANTHROPIC_API_KEY") if not os.getenv(k)]
    if missing:
        sys.exit(f"Missing {', '.join(missing)} - copy .env.example to .env and fill it in.")

    eleven = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    brain = Brain()
    print("Voice assistant ready. Say (or type) 'goodbye' to finish; Ctrl+C quits.")

    while True:
        try:
            if args.text:
                user_text = input("\nYou: ").strip()
            else:
                user_text = transcribe(eleven, record_until_enter())
                print(f"You: {user_text}")
        except (KeyboardInterrupt, EOFError):
            print("\nBye!")
            return

        if not user_text:
            print("(didn't catch that - try again)")
            continue

        try:
            answer = brain.reply(user_text)
        except anthropic.AuthenticationError:
            sys.exit("Claude rejected the API key - check ANTHROPIC_API_KEY.")
        except anthropic.RateLimitError:
            print("Rate limited by the Claude API - wait a moment and try again.")
            continue
        except anthropic.APIConnectionError:
            print("Couldn't reach the Claude API - check your internet connection.")
            continue
        except anthropic.APIStatusError as err:
            print(f"Claude API error {err.status_code}: {err.message}")
            continue

        print(f"Assistant: {answer}")
        if not args.mute:
            speak(eleven, answer)

        if user_text.lower().strip(" .!?") in EXIT_WORDS:
            return


if __name__ == "__main__":
    main()
