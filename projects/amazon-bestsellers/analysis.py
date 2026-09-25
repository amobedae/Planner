"""Analyze Amazon's Top 50 bestselling books, 2009-2019, with pandas.

Run:  python analysis.py
Writes a printed report plus charts and CSV summaries into ./output/.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # render to files; no display needed
import matplotlib.pyplot as plt
import pandas as pd

HERE = Path(__file__).resolve().parent
DATA = HERE / "bestsellers.csv"
OUT = HERE / "output"

# Chart styling: one light surface, recessive grid, two fixed genre colors.
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_MUTED = "#52514e"
GRID = "#e4e3df"
GENRE_COLORS = {"Fiction": "#2a78d6", "Non Fiction": "#eb6834"}


def load() -> pd.DataFrame:
    df = pd.read_csv(DATA)
    df = df.rename(
        columns={
            "Name": "Title",
            "User Rating": "Rating",
            "Reviews": "Num_Reviews",
        }
    )
    df = df.drop_duplicates()
    df["Price"] = df["Price"].astype(float)
    return df


def section(title: str) -> None:
    print(f"\n{title}\n{'-' * len(title)}")


def report(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    section("Dataset")
    print(f"{len(df)} bestseller entries, {df['Title'].nunique()} unique titles, "
          f"{df['Author'].nunique()} authors, years {df['Year'].min()}-{df['Year'].max()}")

    section("Genre split (all entries)")
    genre = df["Genre"].value_counts()
    for g, n in genre.items():
        print(f"{g:<12} {n:>4}  ({n / len(df):.0%})")

    section("Top 10 authors by number of bestseller entries")
    authors = (
        df.groupby("Author")
        .agg(Entries=("Title", "count"), Avg_Rating=("Rating", "mean"))
        .sort_values(["Entries", "Avg_Rating"], ascending=False)
        .head(10)
    )
    authors["Avg_Rating"] = authors["Avg_Rating"].round(2)
    print(authors.to_string())

    section("Average rating, reviews and price by genre")
    by_genre = df.groupby("Genre").agg(
        Avg_Rating=("Rating", "mean"),
        Median_Reviews=("Num_Reviews", "median"),
        Avg_Price=("Price", "mean"),
    ).round(2)
    print(by_genre.to_string())

    section("Most-reviewed books (unique titles)")
    most_reviewed = (
        df.sort_values("Num_Reviews", ascending=False)
        .drop_duplicates("Title")
        .head(10)[["Title", "Author", "Num_Reviews", "Rating", "Genre"]]
    )
    print(most_reviewed.to_string(index=False))

    section("Books that made the list the most years")
    staying_power = (
        df.groupby(["Title", "Author"]).size().sort_values(ascending=False).head(5)
    )
    for (title, author), years in staying_power.items():
        print(f"{years:>2} years  {title} - {author}")

    section("Price over time (average list price)")
    price_by_year = df.groupby("Year")["Price"].mean().round(2)
    print(price_by_year.to_string())

    return {
        "top_authors": authors,
        "genre_summary": by_genre,
        "most_reviewed": most_reviewed,
    }


def style_axes(ax) -> None:
    ax.set_facecolor(SURFACE)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(colors=INK_MUTED, labelsize=9, length=0)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)


def new_figure(title: str, subtitle: str, size=(8, 4.8)):
    fig, ax = plt.subplots(figsize=size, dpi=150)
    fig.patch.set_facecolor(SURFACE)
    fig.suptitle(title, x=0.02, ha="left", fontsize=13, fontweight="bold", color=INK)
    fig.text(0.02, 0.9, subtitle, ha="left", fontsize=9, color=INK_MUTED)
    style_axes(ax)
    return fig, ax


def chart_genre_by_year(df: pd.DataFrame) -> None:
    counts = df.groupby(["Year", "Genre"]).size().unstack(fill_value=0)
    fig, ax = new_figure(
        "Fiction vs. non-fiction in the Top 50",
        "Number of bestseller slots per year, 2009-2019",
    )
    bottom = pd.Series(0, index=counts.index)
    for genre in ("Non Fiction", "Fiction"):
        ax.bar(
            counts.index, counts[genre], bottom=bottom, width=0.7,
            color=GENRE_COLORS[genre], label=genre,
            edgecolor=SURFACE, linewidth=1.5,  # surface gap between segments
        )
        bottom += counts[genre]
    ax.set_xticks(counts.index)
    ax.set_ylim(0, 52)
    ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(0, 1.08), ncol=2,
              fontsize=9, labelcolor=INK)
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    fig.savefig(OUT / "genre_by_year.png", facecolor=SURFACE)
    plt.close(fig)


def chart_top_authors(authors: pd.DataFrame) -> None:
    data = authors["Entries"].iloc[::-1]
    fig, ax = new_figure(
        "Authors with the most bestseller entries",
        "Count of Top 50 appearances, 2009-2019 (a title can appear in several years)",
    )
    ax.grid(axis="y", visible=False)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.barh(data.index, data.values, color=GENRE_COLORS["Fiction"], height=0.6)
    for y, v in enumerate(data.values):
        ax.text(v + 0.2, y, str(v), va="center", fontsize=9, color=INK)
    ax.tick_params(axis="y", labelcolor=INK)
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    fig.savefig(OUT / "top_authors.png", facecolor=SURFACE)
    plt.close(fig)


def chart_rating_vs_price(df: pd.DataFrame) -> None:
    books = df.drop_duplicates("Title")
    fig, ax = new_figure(
        "Does a higher price mean a better rating?",
        "One dot per unique title - user rating vs. list price (USD)",
    )
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    for genre, group in books.groupby("Genre"):
        ax.scatter(
            group["Price"], group["Rating"], s=22, alpha=0.8,
            color=GENRE_COLORS[genre], label=genre,
            edgecolors=SURFACE, linewidths=0.8,
        )
    corr = books["Price"].corr(books["Rating"])
    ax.text(0.99, 0.04, f"correlation r = {corr:.2f}", transform=ax.transAxes,
            ha="right", fontsize=9, color=INK_MUTED)
    ax.set_xlabel("Price (USD)", color=INK_MUTED, fontsize=9)
    ax.set_ylabel("User rating", color=INK_MUTED, fontsize=9)
    ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(0, 1.08), ncol=2,
              fontsize=9, labelcolor=INK)
    fig.tight_layout(rect=(0, 0, 1, 0.9))
    fig.savefig(OUT / "rating_vs_price.png", facecolor=SURFACE)
    plt.close(fig)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    df = load()
    tables = report(df)
    for name, table in tables.items():
        table.to_csv(OUT / f"{name}.csv")
    chart_genre_by_year(df)
    chart_top_authors(tables["top_authors"])
    chart_rating_vs_price(df)
    print(f"\nCharts and CSV summaries saved to {OUT}")


if __name__ == "__main__":
    main()
