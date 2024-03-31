import base64
import json
import math
import re

import segno

PREFIX = "https://www.service.nsw.gov.au/campaign/service-nsw-mobile-app?data="

_KEEP_PATH = re.compile("<path [^/]*/>")

def b10encode(data: bytes) -> str:
    raw = str(int.from_bytes(data, byteorder="little"))
    # Handle leading zeros so that, for instance, b"", b"\x00" and
    # b"\x00\x00" each have their own unique encoding, not just 0
    output_length = math.ceil(len(data) * math.log(2**8, 10))
    prefix = "0" * (output_length - len(raw))
    return prefix + raw

def b10decode(s: str) -> bytes:
    # Deduce the length of the result from the input, matching
    # b64encode's zero-padding (NB. a real implementation should
    # validate the length is valid)
    result_length = math.floor(len(s) / math.log(2**8, 10))
    return int(s).to_bytes(length=result_length, byteorder="little")

# adhoc test is good enough for this
def test_round_trip():
    examples = [
        b"", b"abc",
        *(b"\x00" * i
          + b"\xFF" * j
          +  b"\x00" * k
          for i in range(1, 10) for j in range(1, 10)
          for k in range(1, 10)),
    ]
    for example in examples:
        encoded = b10encode(example)
        decoded = b10decode(encoded)
        assert decoded == example, f"failed to roundtrip {example}: {encoded=}, {decoded=}"

test_round_trip()


def encode_examples():
    examples = [b"\x01", b"\xFF", b"\x12\x34\x56", b"abc", bytes(reversed(range(256)))]
    for example in examples:
        encoded = b10encode(example)
        print(f"{example=}, {len(encoded)=}, {encoded=}")


# QR codes
included_qrs = []

def write_included_qr(prefix, data, label, error):
    url = prefix + data
    qr = segno.make_qr([prefix, data], error)
    modules = 17 + 4 * qr.version
    print(f"{label} length: {len(url)}, version: {qr.version}, scale: {1000 / modules}")
    print(f"{label} url: {url}")

    svg_with_svg_element = qr.svg_inline(svgclass=None, lineclass=None, border=0)
    path_only = _KEEP_PATH.search(svg_with_svg_element).group()

    rect = f'<rect fill="#fff" height="{modules}" width="{modules}"/>'

    base_name = f"qr-code-v{qr.version:02}-{label}"

    included_qrs.append((base_name, modules))

    with open(f"{base_name}.svg", "w") as f:
        f.write(rect + path_only)

DEFS_SVG_TEMPLATE = """\
<svg height="0" viewBox="-20 -20 1270 882" width="0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin-top: 0">
  <defs>
{defs}
  </defs>
</svg>
"""
DEFS_DEF_TEMPLATE = """\
    <g id="{base_name}" transform="scale({scale})" >
      {{% include blog/qr-base10-base64/{base_name}.svg %}}
    </g>
"""
def write_defs():
    formatted = DEFS_SVG_TEMPLATE.format(
        defs="".join(
            DEFS_DEF_TEMPLATE.format(base_name=base_name, scale=1000/modules)
            for base_name, modules in included_qrs
        )
    )
    with open("qr-poster-defs.svg", "w") as f:
        f.write(formatted)


def nsw_gov_example():
    b64 = "eyJ0IjoiY292aWQxOV9idXNpbmVzcyIsImJpZCI6IjEyMTMyMSIsImJuYW1lIjoiVGVzdCBOU1cgR292ZXJubWVudCBRUiBjb2RlIiwiYmFkZHJlc3MiOiJCdXNpbmVzcyBhZGRyZXNzIGdvZXMgaGVyZSAifQ=="

    decoded = base64.b64decode(b64)
    json.loads(decoded)
    print(f"json: {decoded}")

    b10 = b10encode(decoded)
    print(f"{len(b64)=}, {len(decoded)=}, {len(b10)=}")

    write_included_qr(PREFIX, b64, "example-base64", "H")
    write_included_qr(PREFIX, b10, "example-base10", "H")

def maxed():
    max_bytes = 2953
    total_bytes = bytes(i % 256 for i in range(max_bytes))

    prefix = b"http://example.com/"
    b64_content = total_bytes[:max_bytes // 4 * 3 - 15]
    b64_encoded = base64.urlsafe_b64encode(b64_content)

    b10_content = total_bytes[:max_bytes - 31]
    b10_encoded = b10encode(b10_content).encode()

    print(f"{len(b64_content)=}, {len(b64_encoded)=}, {len(b10_content)=}, {len(b10_encoded)=}")

    write_included_qr(prefix, b64_encoded, "maxed-base64", "L")
    write_included_qr(prefix, b10_encoded, "maxed-base10", "L")

# Run the things
encode_examples()
nsw_gov_example()
maxed()

write_defs()
