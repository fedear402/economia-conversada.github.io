import re
from pathlib import Path
import sys

HEX     = re.compile(r"\\'([0-9A-Fa-f]{2})")          #  \'e1  →  á
UNICODE = re.compile(r"\\u(-?\d+)\?")                 #  \u225? → ñ   (if present)
CTRL    = re.compile(r"\\[a-z]+\d* ?")                #  \par, \hich, \f44 …
BRACES  = re.compile(r"[{}]")                         #  strip all leftover braces

def rtf2plain(raw: str, *, encoding="latin-1") -> str:
    """Very quick & dirty ‘RTF → visible text’ converter."""
    # 1) decode hex escapes  (works for Win-1252 Spanish RTFs)
    raw = HEX.sub(lambda m: bytes.fromhex(m.group(1)).decode(encoding), raw)

    # 2) decode \uNNNN? escapes  (if your generator emits them)
    def _u(m):
        codepoint = int(m.group(1))
        if codepoint < 0:                         # RTF stores high BMP as negative
            codepoint += 65536
        return chr(codepoint)
    raw = UNICODE.sub(_u, raw)

    # 3) mark paragraph ends → real newlines
    raw = raw.replace(r"\par", "\n")

    # 4) kill all other control words & braces
    raw = CTRL.sub("", raw)
    raw = BRACES.sub("", raw)

    # 5) collapse weird white-space runs
    raw = re.sub(r"[ \t\r\f\v]+", " ", raw)
    raw = re.sub(r"\n\s+", "\n", raw)

    return raw.strip()


# compile **once** – it’s fast & readable
NAME_RE = re.compile(
    r"""^_?            # some editors wrap italics with underscore
        (?P<name>      #  ← we keep this
         [A-ZÁÉÍÓÚÜÑ]  #  capital letter incl. accents
         [\wÁÉÍÓÚÜÑáéíóúüñ\-\.]*  #  rest of first token
         (?:\s+
          [A-ZÁÉÍÓÚÜÑ][\wÁÉÍÓÚÜÑáéíóúüñ\-\.]*)*  # optional 2nd/3rd token
        )
        _?             # closing underscore if any
        \s*:           # literal colon
     """,
    re.VERBOSE | re.MULTILINE,
)

def extract_speakers_from_text(txt: str) -> list[str]:
    seen, ordered = set(), []
    for m in NAME_RE.finditer(txt):
        nm = m.group("name")
        if nm not in seen:
            seen.add(nm)
            ordered.append(nm)
    return ordered


if __name__ == "__main__":
    try:
        rtf_path = Path(sys.argv[1])
    except IndexError:
        sys.exit("usage: python characters.py <file.rtf>")

    raw_rtf   = rtf_path.read_text(encoding="latin-1")  # switch to utf-8 if needed
    plain_txt = rtf2plain(raw_rtf)                      # step ①
    speakers  = extract_speakers_from_text(plain_txt)   # step ②
    print(speakers)
    
    
    
# ['Sócrates', 'Glaucón', 'Teofrasto', 'Aristóteles', 'Entrevistador', 'Adam Smith', 'Entrevistadora', 'John Nash', 'Jean Tirole', 'Thomas Philippon', 'George Akerlof', 'Ronald Coase', 'Moderadora', 'Joseph Stiglitz', 'Frédéric Bastiat', 'Gary Becker', 'Presentadora', 'Ernesto Schargrodsky', 'Joseph Schumpeter', 'Karl Marx', 'Milton Friedman', 'Rafael Di Tella', 'Moderador', 'Elinor Ostrom', 'Yuval Noah Harari']