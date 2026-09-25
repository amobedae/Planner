# 🎙️ Voice Virtual Assistant

Have a spoken conversation with an AI assistant:

1. **You talk.** The mic recording goes to **ElevenLabs Speech-to-Text** (Scribe).
2. **Claude replies** through the Anthropic API. The full conversation history is kept, so follow-up questions work.
3. **ElevenLabs Text-to-Speech** reads the reply out loud.

## Setup
Requires Python 3.10+ and a microphone.

```bash
cd projects/voice-assistant
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # then paste in your keys
```

- ElevenLabs key: https://elevenlabs.io/app/settings/api-keys
- Anthropic key: https://console.anthropic.com/settings/keys

On Linux, `sounddevice` needs PortAudio: `sudo apt install libportaudio2`.

## Run
```bash
python assistant.py          # speak: Enter starts recording, Enter again stops it
python assistant.py --text   # type your messages; replies are still spoken
python assistant.py --mute   # print replies without audio
```
Say or type **"goodbye"** to finish.

## Customize
Edit `.env` to change the voice (`ELEVENLABS_VOICE_ID`), the ElevenLabs models, or the Claude model. To change the assistant's personality, edit `SYSTEM_PROMPT` in `assistant.py`.
