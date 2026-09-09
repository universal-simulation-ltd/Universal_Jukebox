#!/usr/bin/env python3
"""Build the tag/cover-art test fixtures in src/lib/__fixtures__.

    pip install mutagen pillow
    python scripts/make-fixtures.py

Why this exists, and why it is Python.

`scripts/selftest.mjs` proves the reader in `src/lib/tags.ts` gets the right
bytes back out of a real music file. It could not prove much if the file it read
had been written by us: "our reader agrees with our writer" is the one thing a
round-trip test can never establish, and Universal Converter's selftest says so
at the top for the same reason.

So the fixtures are written by **mutagen** — the tag library behind
picard, beets and quodlibet — and Pillow. They are an independent
implementation of the same three specifications, and every field the reader
claims to understand is written by something that is not us.

The output is COMMITTED, so CI needs neither Python nor mutagen. Re-run this
only when adding a case, and commit what it writes.

Each file is a few kilobytes: the audio is a fraction of a second of silence and
the covers are 8x8, because the point is the metadata layout, not the music.
"""

import io
import os
import struct
import zlib

from mutagen.flac import FLAC, Picture
from mutagen.id3 import (
    APIC, ID3, TALB, TCON, TDRC, TIT2, TPE1, TPE2, TPOS, TRCK, TXXX, USLT,
)
from mutagen.mp4 import MP4, MP4Cover
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "src", "lib", "__fixtures__")

# The one set of values every fixture carries, so the assertions in
# selftest.mjs are the same three lines whatever the container.
TITLE = "Needle Drop"
ARTIST = "The Tone Arms"
ALBUM_ARTIST = "Various Artists"        # differs from ARTIST on purpose: it is
ALBUM = "Sides A and B"                 # what a compilation groups by
TRACK, TRACK_TOTAL = 7, 12
DISC, DISC_TOTAL = 2, 2
YEAR = 1997
GENRE = "Shoegaze"

# ── The lyric sheets ─────────────────────────────────────────────────────────
#
# Doggerel written for this file, about the app, and deliberately so: a fixture
# needs to assert on an exact string, and the only text that can be checked into
# a public repository and compared byte for byte is text nobody owns. It also
# makes a failure obvious — nothing here can be mistaken for a real song.
#
# LRC_SHEET carries the three things the parser has to survive: metadata tags at
# the top, an `[offset:]` (whose SIGN is the trap — see `lyrics.ts`), and a line
# stamped TWICE, which is how every LRC writer stores a repeated chorus.
LRC_SHEET = "\n".join([
    "[ar:The Tone Arms]",
    "[ti:Needle Drop]",
    "[offset:+500]",
    "[00:01.00]The arm comes down",
    "[00:04.50]and the dust begins to sing",
    "[00:09.25][00:21.25]Round and round and round",
    "[00:14.00]",
    "[00:16.75]Side two is where the quiet is",
])

PLAIN_SHEET = "\n".join([
    "The arm comes down",
    "and the dust begins to sing",
    "",
    "Side two is where the quiet is",
])

# The name of a person, in the field next door. It must never be read as a
# lyric — see `LYRIC_KEYS` in `tags.ts`.
LYRICIST = "A. Nother"


def cover(fmt: str, rgb=(224, 85, 4)) -> bytes:
    """An 8x8 solid square, in the format asked for."""
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), rgb).save(buf, format=fmt)
    return buf.getvalue()


def silent_mp3_frame() -> bytes:
    """One valid MPEG-1 Layer III frame header plus its (zeroed) payload.

    Not decodable music — nothing decodes these fixtures. It exists so the file
    is not *only* a tag, which is a shape no real library ever contains and
    therefore a shape worth not testing against.
    """
    # 0xFF 0xFB = MPEG-1 Layer III, no CRC. 0x90 = 128 kbps, 44.1 kHz. 0x00 = no
    # padding, stereo. At 128 kbps/44.1 kHz a frame is 417 bytes less the header.
    return b"\xff\xfb\x90\x00" + b"\x00" * 413


def minimal_flac() -> bytes:
    """A FLAC stream with a STREAMINFO block and no audio frames.

    mutagen will open this and append its own VORBIS_COMMENT and PICTURE blocks,
    which is all the fixture needs; a decoder would find no music, and none is
    ever asked to.
    """
    # STREAMINFO: min/max block size, min/max frame size, then a packed field of
    # sample rate (20 bits), channels-1 (3), bits-1 (5) and total samples (36).
    packed = (44100 << 44) | (1 << 41) | (15 << 36) | 0
    streaminfo = (
        struct.pack(">HH", 4096, 4096)
        + b"\x00\x00\x00" + b"\x00\x00\x00"
        + packed.to_bytes(8, "big")
        + b"\x00" * 16                      # MD5 of the audio: none of it
    )
    header = bytes([0x80 | 0]) + len(streaminfo).to_bytes(3, "big")  # last block, type 0
    return b"fLaC" + header + streaminfo


def box(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload) + 8) + kind + payload


def minimal_m4a() -> bytes:
    """The smallest MP4 mutagen will accept and write an `ilst` into.

    A real M4A's moov carries a full track description; mutagen only insists on
    the boxes it has to walk, so this is ftyp + a moov holding an mvhd and one
    minimal audio trak.
    """
    ftyp = box(b"ftyp", b"M4A " + struct.pack(">I", 0) + b"M4A mp42isom")

    mvhd = box(b"mvhd", struct.pack(">IIIIIi", 0, 0, 0, 1000, 0, 0x00010000)
               + b"\x00" * 70)
    tkhd = box(b"tkhd", struct.pack(">IIIIIII", 0, 0, 0, 1, 0, 0, 0) + b"\x00" * 60)
    mdhd = box(b"mdhd", struct.pack(">IIIIIHH", 0, 0, 0, 44100, 0, 0x55C4, 0))
    hdlr = box(b"hdlr", struct.pack(">II", 0, 0) + b"soun" + b"\x00" * 12 + b"\x00")
    stbl = box(b"stbl", box(b"stsd", struct.pack(">II", 0, 0))
               + box(b"stts", struct.pack(">II", 0, 0))
               + box(b"stsc", struct.pack(">II", 0, 0))
               + box(b"stsz", struct.pack(">III", 0, 0, 0))
               + box(b"stco", struct.pack(">II", 0, 0)))
    minf = box(b"minf", box(b"smhd", struct.pack(">IHH", 0, 0, 0))
               + box(b"dinf", box(b"dref", struct.pack(">II", 0, 0))) + stbl)
    mdia = box(b"mdia", mdhd + hdlr + minf)
    trak = box(b"trak", tkhd + mdia)
    moov = box(b"moov", mvhd + trak)
    return ftyp + moov + box(b"free", b"") + box(b"mdat", b"\x00" * 64)


def write_mp3(path: str, version: int) -> None:
    """version 3 or 4 — v2.3 and v2.4 differ in how frame sizes are encoded."""
    with open(path, "wb") as f:
        f.write(silent_mp3_frame() * 4)
    tag = ID3()
    tag.add(TIT2(encoding=3, text=TITLE))
    tag.add(TPE1(encoding=3, text=ARTIST))
    tag.add(TPE2(encoding=3, text=ALBUM_ARTIST))
    tag.add(TALB(encoding=3, text=ALBUM))
    tag.add(TRCK(encoding=3, text=f"{TRACK}/{TRACK_TOTAL}"))
    tag.add(TPOS(encoding=3, text=f"{DISC}/{DISC_TOTAL}"))
    tag.add(TDRC(encoding=3, text=str(YEAR)))
    tag.add(TCON(encoding=3, text=GENRE))
    tag.add(APIC(encoding=3, mime="image/jpeg", type=3,
                 desc="Front cover", data=cover("JPEG")))
    if version == 3:
        # v2.3 gets the sheet where it belongs: USLT, timed.
        tag.add(USLT(encoding=3, lang="eng", desc="", text=LRC_SHEET))
    else:
        # v2.4 gets it in the place SOME taggers put it instead. A file written
        # this way shows no lyrics at all to a reader that only knows USLT, and
        # there is nothing about it that looks wrong.
        tag.add(TXXX(encoding=3, desc="LYRICS", text=PLAIN_SHEET))
        # ...next to a field that is one letter away from it and is a person's
        # name. Reading this as the words would be silent and wrong.
        tag.add(TXXX(encoding=3, desc="LYRICIST", text=LYRICIST))
    tag.save(path, v2_version=version)


def write_mp3_utf16_desc(path: str) -> None:
    """The APIC trap, on purpose.

    A UTF-16 description terminates with a DOUBLE NUL on an even boundary. A
    reader scanning for a single zero byte stops inside the first character and
    every offset after it is wrong — the cover is "found" and decodes to
    nothing. Nothing about this file looks unusual to a person.
    """
    with open(path, "wb") as f:
        f.write(silent_mp3_frame() * 4)
    tag = ID3()
    tag.add(TIT2(encoding=1, text=TITLE))
    tag.add(TPE1(encoding=1, text=ARTIST))
    tag.add(TALB(encoding=1, text=ALBUM))
    tag.add(APIC(encoding=1, mime="image/png", type=3,
                 desc="Sleeve", data=cover("PNG")))
    # The same double-NUL trap, on the frame next door: USLT's descriptor
    # terminates the same way APIC's does, and a reader that gets APIC right by
    # hand and USLT wrong reads the sheet from a few bytes into itself. A
    # non-empty descriptor, because an empty one is only two bytes and hides it.
    tag.add(USLT(encoding=1, lang="eng", desc="Sleeve notes", text=PLAIN_SHEET))
    tag.save(path, v2_version=3)


def write_flac(path: str) -> None:
    with open(path, "wb") as f:
        f.write(minimal_flac())
    tag = FLAC(path)
    tag["TITLE"] = TITLE
    tag["ARTIST"] = ARTIST
    tag["ALBUMARTIST"] = ALBUM_ARTIST
    tag["ALBUM"] = ALBUM
    tag["TRACKNUMBER"] = f"{TRACK}/{TRACK_TOTAL}"
    tag["DISCNUMBER"] = str(DISC)
    tag["DATE"] = f"{YEAR}-08-04"        # a full date, not a bare year
    tag["GENRE"] = GENRE
    # The Vorbis spelling most taggers use, beside the field it must not be
    # confused with.
    tag["UNSYNCEDLYRICS"] = PLAIN_SHEET
    tag["LYRICIST"] = LYRICIST
    pic = Picture()
    pic.type = 3
    pic.mime = "image/png"
    pic.desc = "Front cover"
    pic.width, pic.height, pic.depth = 8, 8, 24
    pic.data = cover("PNG")
    tag.add_picture(pic)
    tag.save()


def write_m4a(path: str) -> None:
    with open(path, "wb") as f:
        f.write(minimal_m4a())
    tag = MP4(path)
    tag["\xa9nam"] = [TITLE]
    tag["\xa9ART"] = [ARTIST]
    tag["aART"] = [ALBUM_ARTIST]
    tag["\xa9alb"] = [ALBUM]
    tag["trkn"] = [(TRACK, TRACK_TOTAL)]
    tag["disk"] = [(DISC, DISC_TOTAL)]
    tag["\xa9day"] = [str(YEAR)]
    tag["\xa9gen"] = [GENRE]
    tag["\xa9lyr"] = [PLAIN_SHEET]
    tag["covr"] = [MP4Cover(cover("JPEG"), imageformat=MP4Cover.FORMAT_JPEG)]
    tag.save()


def write_untagged_mp3(path: str) -> None:
    """No tag block at all — the case `scan.ts` has to fall back to a filename
    for, and the one a folder of 400 loose downloads is full of."""
    with open(path, "wb") as f:
        f.write(silent_mp3_frame() * 8)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    write_mp3(os.path.join(OUT, "id3v23.mp3"), 3)
    write_mp3(os.path.join(OUT, "id3v24.mp3"), 4)
    write_mp3_utf16_desc(os.path.join(OUT, "id3v23-utf16.mp3"))
    write_flac(os.path.join(OUT, "vorbis.flac"))
    write_m4a(os.path.join(OUT, "mp4.m4a"))
    write_untagged_mp3(os.path.join(OUT, "untagged.mp3"))

    # The covers on their own, so the reader's output can be compared byte for
    # byte against what actually went in rather than against a length.
    with open(os.path.join(OUT, "cover.jpg"), "wb") as f:
        f.write(cover("JPEG"))
    with open(os.path.join(OUT, "cover.png"), "wb") as f:
        f.write(cover("PNG"))

    for name in sorted(os.listdir(OUT)):
        size = os.path.getsize(os.path.join(OUT, name))
        print(f"  {name:24} {size:>7,} bytes")


if __name__ == "__main__":
    # zlib is imported for its side effect of being available to Pillow's PNG
    # writer on a bare install; referencing it keeps linters quiet.
    assert zlib is not None
    main()
