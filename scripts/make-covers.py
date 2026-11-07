"""Original vector cover concepts. Not reproductions of published editions."""
from pathlib import Path
from html import escape

CATALOG = [
    ('white-nights', ['БЕЛЫЕ', 'НОЧИ'], 'ФЁДОР ДОСТОЕВСКИЙ', '#243e54', '#f8eed5', 'moon'),
    ('lady-dog', ['ДАМА', 'С СОБАЧКОЙ'], 'АНТОН ЧЕХОВ', '#b1c4c7', '#263f49', 'waves'),
    ('blizzard', ['МЕТЕЛЬ'], 'АЛЕКСАНДР ПУШКИН', '#eee8dc', '#4b617b', 'snow'),
    ('queen-spades', ['ПИКОВАЯ', 'ДАМА'], 'АЛЕКСАНДР ПУШКИН', '#343748', '#e7d4ad', 'ring'),
    ('garnet', ['ГРАНАТОВЫЙ', 'БРАСЛЕТ'], 'АЛЕКСАНДР КУПРИН', '#6f3443', '#f0dfb9', 'ring'),
    ('asya', ['АСЯ'], 'ИВАН ТУРГЕНЕВ', '#e3beaa', '#594547', 'flower'),
    ('scarlet-sails', ['АЛЫЕ', 'ПАРУСА'], 'АЛЕКСАНДР ГРИН', '#f3c2a0', '#a83e32', 'sail'),
    ('olesya', ['ОЛЕСЯ'], 'АЛЕКСАНДР КУПРИН', '#3c5d50', '#e7dfb5', 'leaves'),
    ('first-love', ['ПЕРВАЯ', 'ЛЮБОВЬ'], 'ИВАН ТУРГЕНЕВ', '#a5b7a0', '#243b30', 'flower'),
    ('gambler', ['ИГРОК'], 'ФЁДОР ДОСТОЕВСКИЙ', '#943f36', '#f6dbb3', 'ring'),
    ('dikanka', ['ВЕЧЕРА', 'НА ХУТОРЕ', 'БЛИЗ ДИКАНЬКИ'], 'НИКОЛАЙ ГОГОЛЬ', '#263f56', '#e4c798', 'snow'),
    ('ivan-ilyich', ['СМЕРТЬ', 'ИВАНА ИЛЬИЧА'], 'ЛЕВ ТОЛСТОЙ', '#d5d1c8', '#4a524e', 'window'),
    ('captain-daughter', ['КАПИТАНСКАЯ', 'ДОЧКА'], 'АЛЕКСАНДР ПУШКИН', '#b8a17e', '#314b55', 'sail'),
    ('fathers-sons', ['ОТЦЫ', 'И ДЕТИ'], 'ИВАН ТУРГЕНЕВ', '#4e685c', '#ebe5cd', 'leaves'),
    ('dubrovsky', ['ДУБРОВСКИЙ'], 'АЛЕКСАНДР ПУШКИН', '#7b4537', '#e6cf9b', 'road'),
    ('hero-time', ['ГЕРОЙ', 'НАШЕГО', 'ВРЕМЕНИ'], 'МИХАИЛ ЛЕРМОНТОВ', '#9aaeb5', '#273d4d', 'mountain'),
    ('childhood', ['ДЕТСТВО'], 'ЛЕВ ТОЛСТОЙ', '#d8dcb7', '#526344', 'leaves'),
    ('wave-runner', ['БЕГУЩАЯ', 'ПО ВОЛНАМ'], 'АЛЕКСАНДР ГРИН', '#496f82', '#f1e5c6', 'waves'),
    ('crime', ['ПРЕСТУПЛЕНИЕ', 'И НАКАЗАНИЕ'], 'ФЁДОР ДОСТОЕВСКИЙ', '#9b4835', '#f2e4bf', 'window'),
    ('oblomov', ['ОБЛОМОВ'], 'ИВАН ГОНЧАРОВ', '#c0c3a5', '#405543', 'window'),
    ('dead-souls', ['МЁРТВЫЕ', 'ДУШИ'], 'НИКОЛАЙ ГОГОЛЬ', '#383e50', '#e6d7b8', 'road'),
    ('anna', ['АННА', 'КАРЕНИНА'], 'ЛЕВ ТОЛСТОЙ', '#783c46', '#eedfc2', 'flower'),
    ('karamazov', ['БРАТЬЯ', 'КАРАМАЗОВЫ'], 'ФЁДОР ДОСТОЕВСКИЙ', '#c4b7a2', '#444131', 'mountain'),
    ('ordinary-story', ['ОБЫКНОВЕННАЯ', 'ИСТОРИЯ'], 'ИВАН ГОНЧАРОВ', '#798f9b', '#f5ead2', 'leaves'),
]

def illustration(kind, ink):
    parts = {
        'moon': '<circle cx="204" cy="255" r="48" fill="currentColor"/><circle cx="224" cy="240" r="43" fill="var(--bg)"/><path d="M36 359h248M45 344h230M63 329h199M83 314h169" stroke="currentColor" stroke-width="1" opacity=".3"/><path d="M45 360V285h15v-28h15v28h14v75m20 0v-66h20v-35h18v35h17v66m23 0v-52h31v52m24 0v-81h15v-26h9v26h20v81" fill="currentColor" opacity=".3"/>',
        'sail': '<path d="M163 209v144M157 222L76 319h81zm12 3 75 94h-75z" fill="currentColor"/><path d="M72 330h184l-28 27H98z" fill="currentColor"/><path d="M42 373q20-10 40 0t40 0t40 0t40 0t40 0t40 0M42 386q20-10 40 0t40 0t40 0t40 0t40 0t40 0" fill="none" stroke="currentColor" opacity=".4"/>',
        'waves': ''.join(f'<path d="M25 {250+i*23}q34-32 68 0t68 0t68 0t68 0" fill="none" stroke="currentColor" stroke-width="{2 if i%2 else 1}" opacity="{.8-i*.08}"/>' for i in range(6)),
        'snow': '<circle cx="237" cy="239" r="31" fill="currentColor" opacity=".7"/><path d="M30 340q70-35 135 0t130 0v40H30z" fill="currentColor" opacity=".16"/><path d="M105 355V220m0 5-45 75h90zm0 45-58 70h116z" fill="currentColor" opacity=".65"/>' + ''.join(f'<circle cx="{30+i*43%260}" cy="{225+i*31%140}" r="2" fill="currentColor"/>' for i in range(13)),
        'road': '<path d="M50 378c180-65 190-108 100-160M145 380c160-60 114-122 25-162" stroke="currentColor" stroke-width="2" fill="none"/><path d="M25 303q75-35 146-10t124-23M25 315q50-20 90-15" stroke="currentColor" opacity=".4" fill="none"/><circle cx="246" cy="238" r="23" fill="currentColor" opacity=".35"/>',
        'ring': '<circle cx="160" cy="298" r="66" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="160" cy="298" r="56" fill="none" stroke="currentColor" stroke-width="1" opacity=".4"/>' + ''.join(f'<circle cx="{160 + 66*__import__("math").cos(i*__import__("math").pi/4):.2f}" cy="{298 + 66*__import__("math").sin(i*__import__("math").pi/4):.2f}" r="9" fill="currentColor"/>' for i in range(8)),
        'flower': '<path d="M155 380q30-100-5-151m10 93q-60 6-68-39 42-3 68 39m1 19q60 0 68-51-46 6-68 51" fill="none" stroke="currentColor" stroke-width="2"/><g transform="translate(150 245)" fill="currentColor" opacity=".8"><ellipse rx="13" ry="32" transform="rotate(0)"/><ellipse rx="13" ry="32" transform="rotate(60)"/><ellipse rx="13" ry="32" transform="rotate(120)"/></g><circle cx="150" cy="245" r="8" fill="var(--bg)"/>',
        'leaves': '<path d="M155 385V220M155 351l-53-44m53 24 51-43m-51 11-43-41m43 25 42-43" fill="none" stroke="currentColor" stroke-width="2"/>' + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="13" ry="31" transform="rotate({r} {x} {y})" fill="currentColor" opacity=".6"/>' for x,y,r in [(108,313,-45),(198,295,45),(116,263,-45),(189,248,45),(155,229,0)]),
        'window': '<path d="M90 379V254a70 70 0 0 1 140 0v125zm70-192v192M90 286h140M90 331h140" fill="none" stroke="currentColor" stroke-width="2"/><path d="M83 387h154" stroke="currentColor" stroke-width="3"/><path d="M101 368l48-65m23 65 47-65" stroke="currentColor" stroke-width="1" opacity=".2"/>',
        'mountain': '<path d="M25 371l91-128 71 102 48-92 60 118z" fill="currentColor" opacity=".25"/><path d="M32 378l84-135 26 43 25-8m-41 85 109-110 58 123" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="217" cy="223" r="24" fill="currentColor" opacity=".7"/>',
    }
    return f'<g style="color:{ink}">{parts[kind]}</g>'

target = Path(__file__).resolve().parent.parent / 'public' / 'covers'
target.mkdir(parents=True, exist_ok=True)
for key, lines, author, background, foreground, motif in CATALOG:
    size = min(43, 258 / max(map(len, lines)) * 1.6)
    title = ''.join(f'<text x="160" y="{102+i*(size+8)}" text-anchor="middle" font-family="Georgia,serif" font-weight="400" font-size="{size}" letter-spacing="1" fill="{foreground}">{escape(line)}</text>' for i, line in enumerate(lines))
    art = f'''<svg xmlns="http://www.w3.org/2000/svg" width="320" height="460" viewBox="0 0 320 460" style="--bg:{background}">
<rect width="320" height="460" fill="{background}"/><rect width="7" height="460" fill="#000" opacity=".1"/><rect x="9" width="1" height="460" fill="#fff" opacity=".13"/>
<rect x="23" y="23" width="276" height="414" fill="none" stroke="{foreground}" stroke-opacity=".24"/>
<text x="160" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" letter-spacing="2" fill="{foreground}">{escape(author)}</text>
{title}{illustration(motif, foreground)}
<path d="M145 410h30m-15-4v8" stroke="{foreground}" stroke-width="1" opacity=".5"/>
<text x="160" y="428" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" letter-spacing="2" fill="{foreground}" opacity=".7">ИСТОРИИ ВНЕ ВРЕМЕНИ</text>
</svg>'''
    (target / f'{key}.svg').write_text(art)
print(f'Created {len(CATALOG)} original cover concepts in {target}')
