---
layout: default
title: "QR error correction helps and hinders scanning"

description: >-
    A QR code can use one of four error correction levels. Higher error correction forces denser codes, but allows scanning in more situations. A trade-off!

js:
    - "/js/plotly.js"
no_jquery: true

hero_image: hero.png

hashtags: []
comments:
---

Error correction sounds good. It means fewer errors, right? When it comes to QR codes, that'll mean easier scanning for people, surely? It seems like that's not the whole story.

I wondered about this, and couldn't find an answer, so I did some exploration, and found there's two factors in tension: the error correction on one hand, and the resulting data density on the other:

1. For fixed data, like a particular URL, it's **easier** to read a QR code with **lower** error correction, but only when there's minimal damage to the code (like reflections and dirt).
2. Error correction works as advertised when there's damage: **higher** error correction means **more** codes can be read.

The rest of this article explores what this means.

## Quick intro to quick response

QR (quick response) codes are now extremely widespread in Australia, because they're used for COVID contact tracing check-ins and placed in every shop window, but they're somewhat magic. Before diving into the details, Wikipedia says [a whole lot about QR codes][wiki_qr]; the summary is: a QR code is a pattern of black and white squares that encodes some data (often a URL), that cameras can read.

The article even has diagrams. Here's one with a whole lot of detail, highlighting a bunch of key concepts going into a QR code, however there's two that are most important when considering how easy it is to scan a QR code: **version** and **error correction**.

[wiki_qr]: https://en.wikipedia.org/wiki/QR_code

{% include image.html src="1024px-QR_Code_Structure_Example_3.svg.png" width="1024" height="574" link="https://commons.wikimedia.org/wiki/File:QR_Code_Structure_Example_3.svg" caption="A diagram of the functional parts of a QR code. [source](https://commons.wikimedia.org/wiki/File:QR_Code_Structure_Example_3.svg)" alt="A graphic containing a QR code, with highlighted areas. These areas are labelled as: 1 version information, 2 format information, 3 data and error correction key, 4 required patterns, 4.1 position, 4.2 alignment, 4.3 timing, 5 quiet zone" %}

What are these two factors?

- **error correction** (EC): a measure of redundancy in the QR code, translating into how much "damage" it can tolerate and still be readable. This is how images and logos can be directly embedded into QR codes, without any special consideration. This is **chosen** when creating the QR code. The number of modules that can be damaged for each level is:

  <div class="table-wrapper" markdown="1">

  | EC           | max damage |
  |--------------|-----------:|
  | L (low)      |         7% |
  | M (medium)   |        15% |
  | Q (quartile) |        25% |
  | H (high)     |        30% |

  </div>

- **version**: the number of little squares (modules) along each side of the big square. This is normally **computed** automatically when creating the QR code (from the data and error correction).

  <div class="table-wrapper" markdown="1">

  | version |   modules |
  |--------:|----------:|
  |       1 |        21 |
  |       2 |        25 |
  |     ... |       ... |
  |     *n* | 4*n* + 17 |
  |     ... |       ... |
  |      39 |       173 |
  |      40 |       177 |

  </div>

{% include image.html src="v1-v18-v40.png" width="1110" height="378" caption="Three QR codes, using versions 1, 18 and 40 (from left to right)." alt="An image showing three QR codes placed horizontally, the left most one consists of only a very large modules, while they're barely distinguishable in the right most one." %}


Together, the version and error correction dictate how much data a given QR code can store[^modes]:

[^modes]: There's also the concept of the *mode*: Numeric, Alphanumeric, Binary or Kanji. However, they all store an (approximately) equal number of bits, so I'll just use the Binary mode, because I'm far more used to talking about bytes than bits.

    Details: each mode defines an input character set and then an efficient way to encode those characters. For example, for Numeric, the permitted characters are 0, 1, ..., 9, and they're encoded with 3 digits in 10 bits. The Binary mode is probably familiar: one input byte is encoded into 8 bits in the QR code. To convert numbers in this post into bits, multiply by 8. To convert the number of bits to the number of input characters in each mode, divide by the appropriate coefficient (Numeric: 10/3; Alphanumeric: 11/2, Binary: 8, Kanji: 13).

{% include plotly.html height="300px" caption="The number of bytes a QR code can store, at each version and EC level. (This can be read horizontally too: for a given number of bytes, what version is required?)" data="eJzNVk1v20YQ/SsEe3ALjIGd/V7fgiBACrSHNmgvRQ4raWVtQ5EGSTtSDf33vqEUtwXiHIIArgGR1HLnvTfzZlZ+bDd5zu3NH49tV/vS3jy20y7f4aHdPbTUfqybedfe2BO1+zx+KKPsWA/dgIf2u+0qrZRv5eWwkRjBmBDW5718/QmPB4AzaTJkyZGnQJESsSJmYk1siC2xI/bEgTgSJ9KKNGI0aUPaknakPelAOpJOZBQZJgNIQ8aScWQ8mUAmkklk1Xtqj0IaZI8zFICpgG6EB58kuGAIAoKPD2RBYV0kB2YXPXlrKUBLwN6I9aRFsoJWlSCbg2gP+CrBbD3kO4hjL5cAWo4WGSYHKuWhmmMUUkkH2rXzePIJmUaFS3IGoufjUvdpnecZhT7RV3my3lprv+DJzy/qiZUoq8mjrvZsCyBRPLAIAbAdWCIiBQ/bLARZB1sUtHqFSEveQzO0hpBgT6CE55SgVDmkwdDGnJCN9uAwAU9WGJx5skgvhNgsoZyi5Cd2LApA/c3sCJHXfvO8Hb+8qB0sONhm0fKKgiX0PisQAIBhBAcgLl0rTSvQgASpQWFNsmRhpY2YMpTSYQo8EL2HMVAbEB+VAySyAWbCPlYCzJIUYxneyyXKIAmb1ZIqfGAHZ9n7bzcWSv7s8z68fUkf5AyRaCMVxQGE80fGI0XpY+lgsLrFDEbRtXBiInB2AB0fQUNxLYyyAgsDHCQ70LlkMDFIRkCBF2BYwGhE3CO+JzncpP5K6q+wmxkQrIUXJ9xn6o+lLh+H+1nqux368z3va3eUbcdpLvvr+0rNdb6768r1eYWu3pXboTS//XhFza/DapgHat6W7qHMdZ2peTXW3FEz5X66nspYt9RcvZL45rVY2LzZD39WhD7BXFZg21T/gkC+GH9bexEEVShTuzrfuvYGVzSCwqau3JZ+s2yqc7c00lwOCGjfvJYGGcZa+jnPdeilt8BwzP16t/QRdM/Dvl1sY3TM04uubOdzCwnFbngoY5dXpft/FOl0Eq2HOn0u69/LOEmu2AOaD3dj2dbDP+uNlHg3fPzPu20dJ8lXFi8DlccxHy9LD7mblmHCz+gyQGYZmrQMipPhkLGwMgrLEIy5vy3nAPX+JAV/Ruu7eRjLppF/WprvV8e5TD980j3db8/ammX9X6qf3vQDzo1P9lxkH5r7vm5rwRl9+hu9UFWV" %}

(The plots in this article are interactive: hover/tap for more info, tap or double tap the legend to toggle series' visibility, tap-and-drag to zoom, and hit the 'home' icon to reset.)

That plot indicates a QR code using EC level H can store **less than half** the data of one using level L: the closest they get is at version 3 (53 vs. 24 bytes). The other levels have less overhead, but it's still a cost that's paid:

<div class="table-wrapper" markdown="1">

| EC | max bytes (version 40) | storage relative to L (mean) |
|----|-----------------------:|-----------------------------:|
| L  |                   2953 |                         100% |
| M  |                   2331 |                          79% |
| Q  |                   1663 |                          57% |
| H  |                   1273 |                          43% |

</div>

That's some hefty overhead: presumably it is useful for something... I did some experiments.


## Experiments

I set up a little Rust program that ran [ZBar][zbar] against an exhaustive set of different QR configurations: all 40 versions and all 4 EC levels. For each of these 160 configurations:

[zbar]: http://zbar.sourceforge.net/

1. scale the QR code to given size
2. place it into a [background image](https://www.flickr.com/photos/_mia/5612839179), to simulate "real world" conditions
3. pass the resulting image into ZBar and check if it scans successfully
4. repeat at different sizes to find the smallest size at which the QR code scans successfully, or determine that it couldn't be scanned at any size

{% include image.html src="qr-example-7-h-800.jpg" height="400" width="800" link="qr-example-7-h-full.png" alt="An photo of a shopfront window with some text and reflection of the person. There is a large obviously-CGI QR code overlaid on part of the shopfront." caption="An excerpt of an example of the generated image: the code is EC level H and version 7, and has been scaled to 700 pixels on each size. Tap for full size." %}

## Error correction makes scanning more reliable

Error correction sounds useful for scanning: if the QR code is further away or smaller, then there's more likely to be blurriness or other "damage", and so higher error-correction will make it easier to read... right?

A camera generally doesn't care about the actual distance, as it just "thinks" in the pixels it sees. Thus, it's the size of the QR code within the overall image that matters. I call this the *field of view*. Example, for the full sized version of Figure 4:

<div class="table-wrapper" markdown="1">

|            |     size (px)  | total (px) | field of view |
|------------|------------------:|-------------:|--------------:|
| full image | 2592 &times; 1944 |        5.04m |          100% |
| QR code    |   700 &times; 700 |        0.49m |          9.7% |

</div>

Under the reasonable assumption that the camera is close to [rectilinear](https://en.wikipedia.org/wiki/Rectilinear_lens), this gives a measure of how close the user has to be that scales smoothly with the physical size of the QR code: if the device can read a 10cm QR code from 1m away, it'll be able to read a 1m code from 10m. Similarly, fields of view can be used to predict distance: given two codes, where the first needs 4% field of view and the second only needs 1%, the second can likely be scanned from about twice as far[^quadratic].

[^quadratic]: For fixed field of view, the distance scales linearly with the side length of the QR code and the field of view is proportional to the area, which scales (close to) quadratically with the side length, so the permitted distance is approximately inversely proportional to the square root of the required field of view: quadrupling the required field of view requires being half the distance (approximately).

Error correction definitely allows scanning a given QR code from further away. At version 40, a level H QR code only requires 1.7% field of view, while a level L one requires 2.4%.

{% include plotly.html height="300px" caption="The field of view required to scan a QR code of a given version, at each EC level (lower is better)." data="eJzNl9tu20YQhl+FYGG4BdbCng+6C4IALlBfOEV7E+SCliibDS0KEn1QDb17Z/4VqaRRkaQJYBvQaD174C6//WdGT+W86qty+u6pvOnu63WzXHTltNx8aFalKNv6ul7Or9fd3Yqcv5Hntlp/qNfl9KmcdW1HjfKnxVW6kp76ulU1a/ptOZUTv6Oh3bym/jxjQ/3L6rbeL7O56R7y4uV0UbWbWpSPtAkltDDCCie8CCKKJJQUSgmlhTJCWaGcUF6oIFQUKgkthaY5WmgjtBXaCe2FDkJHoZMwUhglDC1phLHCOGG8MEGYKEwSVr4XJW32nZxIK8h4NpGM4g8MuzS3NI+g55AJbBIZWpUMDzHsMzw18GDn2PAMz/9Gnhbj0Ercm+zYohNN+HAT2jS16GPZODr7JLCf3Y4ONLH0FiaJTopRtISe0Dk0TaST9NsVv9zNrOp7AkTsmmXNnB6aeX9TTu1uJ76C8cVxxrOFtfYbGF+8UMb8xmXYM5ZMUcUR9IExWjzW6IExuwy7LE+wamzxIoGXHD5xwB24KzJHPDKh5Zk0fxitGWlzy/NViHGPPAaGrNH6cXwvj/MNUc38/Ov5Xr48vuYTvhDyQc1MUKVP+YaRrxrYGjuwNTzYjrwB2LHxPMPDp0fGTNcMopXMjM/JD1McK/Ytw8YfcOuBMmTu/Y+jfH6csuQ/+/WUz18yZTco+EDZDZQh6kwZJo6U7Uh5VPExyAjjY0A/QM7/EOMBMR+Tr9I+hhvEb9a4zVGbubL5H4D7+nbVVj0PP3naTid6d3I0JQ8rfJ6QxzVHxDz2X6n4OWlCTDIgNCNkKmBVoKYsVAsCKoFoTr4OQk5mzMEBLDVggiGCvXPc6ZHXvQfLTBlBGgkY41JgIUpkV5WhImhrkDOZJlTs0OslQ/YIzSFaiJh7Ey2s6TRsVURedkjR5nPu3wT54hjkMSN/EfLFc0NGYRX8R5A1KiwoFfAUtKYiSi1cAY3IrCFEnRClNUotn6MzUi9KLgt1Os2wnU9QLzS8Z57zM/dGlG0xIhlb1iZIyoASDPw1vw8Ch3Dt2G8R12WAnLOMeWZwPDCanKSZs1T2OzlfHuM8ZuYvcr58Zs6IstLmCI3ADKXJFA60Lch7eCBgnctrBxuhZiRrA4/BfbEgb8HTIbs79LoEaeOJPiFQ2xyuQRvhI0n2JJdpB+DO0RoSR67Wnj3GsJStRE2GjOysQ8JOkDv3hgDqNn0n6fNjpMfs/EXS589MOpfSAJ3FjR82MgFxLqjNWFYrhFqNVK1RSmsPhadcYKMMA3I4LIRvQTn/mNJA7YAatRcKbdRrIbKNmB5jgq7tPj1LMOftkEWA1pC4QQluEPQx2EnE9oiojsos6CMV945cbbXt7nqmtuiW+bu6bdotD9tuiPzZXSOKs2q1auuz7BGnv9fXXV388eupKN52V13fieK8bu/rvplVoni1bqpWFJtquTnbUFW3EMXpK55fvOaLUby57f5qaOq4zN7DpVnzN21Q4Z5U6+tmyRuiXRHm8ip/tVTiiZKul9wNdxCDmr7F5evrR5pQvnlN97fs1k297Ku+6Wil8oaesK2WsxvcTtp3392WuAKKbt/Y0daLPl9HfgQU0FZXdfsyXhJVU7TXx2Zz7NR/UrHLZ6Ux9JgPq3W9aB4P/mJf/X7St2jWGz4vO/firNbrart33VOFDGFaEiSL0UCACaJzLDSWmGVZQVDranld5wny/Y5f+H/s9fJtsWjqdl50i+K+qR+Kn09+GTa+uVvkzZ18tOPRuewozgxo9lt+LO6WDa03pxf0D07LbKM=" %}

This seems to all come back to the size of the individual modules (the small squares that make up the overall QR code):

{% include plotly.html height="300px" caption="The field of view of an individual module required to scan a QR code of a given version, at each EC level (lower is better)." data="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" %}

The lines of best fit look pretty flat, and quantitative measures like the parameter confidence intervals agree (except for level L, the 95% confidence intervals on the slope coefficient include 0). In other words: a QR code is scannable if its modules are sufficiently large, and that size threshold doesn't change much as the version changes.

On the other hand, the size threshold *does* change with EC level: level L modules need to be 25-35% larger than level H ones, matching the intuition about the benefits of higher error correction.

Cool, hypothesis confirmed: error correction makes scanning more reliable...

## Error correction makes scanning less reliable

Not so fast! When creating a QR code, versions and module sizes usually don't matter, it's the data that matters: one will usually choose the data and error correction, and then have the version computed automatically, as the smallest that works.

The overhead of higher error correction matters a lot.

{% include image.html src="v3l-v6h.png" height="364" width="716" alt="" caption="This post's URL encoded at EC level L (left) and EC level H. At level L, the data fits in a version 3 code, while level H requires version 6, resulting in smaller modules (half the area/field of view)." %}

If we change from looking at the version to the actual data stored, the ordering reverses, and EC level L works best!

{% include plotly.html height="300px" caption="The field of view required to scan a QR code containing a given amount of data, at each EC level (lower is better)." data="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" %}

If one is trying to "send" 1000 bytes via QR code, using level H requires a field of view of 1.4%, while level L only needs half that (approximately), at 0.8%. This means a device can be further away and still read the L code successfully.

This doesn't seem to match the results in Figures 5 and 6. What's going on? The level L code uses version 22 with 105<sup>2</sup> ≈ 11k modules, while level H requires version 36 with 161<sup>2</sup> ≈ 26k modules. This ratio (2.35) is much larger than the ratio between the module sizes (~1.3), so, sure, level H allows the individual modules to be smaller, but it requires using so many more that the overall QR code is larger than the level L ones[^consistency].

[^consistency]: The various numbers flying around here match up: level L modules need to be ~30% larger than level H ones, and the level H QR code requires 2.35&times; more modules. This predicts that the level H code would have to be 2.35/1.3 = 1.81 times larger than level L one, and that's pretty close to what we observed: 1.4/0.8 = 1.75.

This seems to apply consistently across versions, as might be expected from Figure 3: a QR code at level L can store twice as much data as one at level H, for the same version. The data storage overhead of error correction doesn't seem be worth the apparently dubious benefits.

Nice. *This* hypothesis&mdash;error correction makes scanning less reliable&mdash;is correct, right?

## Error correction really does make scanning more reliable

There is more to the story. Those measures had no noise introduced to the QR codes. They're the easy cases. What happens if we turn up the noise?

I generated 10 different noise patterns, and thresholded them at 8 different levels, and overlaid this noise across each of the QR codes, for a total of 160 &times; 80 = 12800 configurations. This is meant to simulate reflections and dirt that could make it harder for a device to read the code.

{% include image.html src="qr-example-7-h-noise-together.jpg" height="286" width="800" alt="Three QR codes overlaid; from left to right: 1, the QR code displayed in Figure 4; 2, the same QR code with some white and black regions of damage; 3, the same QR code with larger and more regions of damage." caption="Three levels of damage to the example QR code in Figure 4: no damage ([full](qr-example-7-h-full.png)), some regions of white and black noise ([full](qr-example-7-h-noise-less-full.png)), even more and larger regions of noise ([full](qr-example-7-h-noise-full.png))."  %}

Across all of these experiments, **60% more** EC level H QR codes could be scanned successfully than level L ones:

<div class="table-wrapper" markdown="1">

| EC | number successfully scanned |
|----|----------------------------:|
| L  |                        1257 |
| M  |                        1600 |
| Q  |                        1839 |
| H  |                        2001 |

</div>

This is driven by resilience to damage: the QR code at level H is more likely to be able to be read when there's significant damage. The following plot has a point for each successful scan, against the percentage of pixels damaged.

{% include plotly.html height="300px" caption="The amount of damage sustained by successfully scanned QR codes. The hover information displays the number of points to the left of the line (number of successful scans up to and including that amount of damage)." data="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" %}

Under these experimental conditions, level L codes become much less readable above ~6% damage, level M above ~12%, level Q above ~18% and level H above ~20%. This correlates with the resilience I quoted in the table above.

## Conclusion

I've learnt that the four different QR error correction levels influence both **data volume** and **ability to scan**. For a given QR version, increasing error correction allows storing less data, but makes scanning easier and more reliable. However, for storing a fixed amount of data, like a particular URL, the version is computed automatically, and the easier scanning can **trade off** against the data volume. This ties back to the size of the individual modules (little squares): there is a minimum certain size before a code is scannable, and so a denser code needs to be larger.



## Experimental caveats

The results I've talked about here are all empirical, and there's a bunch of reasons that they're not perfect:

1. I tested only one method of reading QR codes, [ZBar][zbar], although some quick experiments with my iPhone seem to correlate with the results here.
2. I also tested only one background image, so the behaviour may differ greatly with QR codes contained in different surrounds.
2. The QR codes are generated to be perfectly rectangular and aligned to the image pixel grid, which is unlikely to happen in the real world.
3. The noise generated is random Perlin noise, which isn't likely to be what occurs in the real world.
4. The overlaying of the noise carefully skips damaging the position patterns (the big squares in three corners), because the performance is catastrophically worse if they can be damaged too.

{% include comments.html c=page.comments h=page.hashtags %}


<script id="plotly-template" type="application/zlib">
eJztWutu4ygUfhf/2kpoZPC9r1JVI2KTxCoxWYy3TaO8+56DISGXdkeabppRLNWqgz/O+TgX7tuo4YZHj9toxnX0+LSNhNZK/3zDolpJBYWRXsz+SnJi/x6iHXGYzaeYFdcvQiNEtp04hbIkJfZJ2UNEote2McvoMf6RQc01N0boDqvMWylXqoHqkfpHaMk3AO7bdyigMbwp2Tat2WBNtoOqZrNGLLZl90zw/1pJ17BvJjQSQVY1/BDGcuL8re1RrugaZHXZmiRa6Lbx316XrRFQFuJ92artlL4E7g3X5mMNO7TVzVBxRnN2siZbKq3WUqBPnpzjbMBuIzVYYd5hULutXz4ij9+kAE+W43uPfhxM3zbCfXVyWEDjoNtSUZ1Rg74iDyukr7kENk9P8Q+QbSOWQLRmD9EzwbKcFWkWV2WcVIxmeeUwKaEZSalDUZalVUyrPC7KNKFJMaLSAkKfZIVHlSVLMlallBZ5WsT5iCooYSUpmEOxQFuJ2kdUVZAkJqVHoZJQ6QiioA5RlUdZPdler0NlMWEFqTz7NFCGyh2qAPaMlKVDZWH7WJY5Q8QJYTkpvMbsWCFzKOAFxsi9JT4wKrixyEnueeXVsUpvekZoXJAicbAiMClq9jBwUZKRynuyDJsIij0sIzQHicxbttzrG63rcTkB/4HXvdojnUmWeBxYDZpNy7GtdB9VaHTsB1kMH54PWeDCPkiBoB+7bkIeqUdCS8HNiq+nnJxy8p5y0od9kAILOSXBlAR3mAQQ+DYN2t6ohearkyn/70/hD5KP9LBmSrgp4e4q4YLQP0mFaW00ZcR9Z0S4TFqJfplcc3hwdJxepLDmulZKN71lcbTv9T+zOdA5cLCMWjHufA1GwfC8aEGa0YM4wAGAQEhqHLJPxvHrUvccAj7OoVc25TcbwEWT+xWs+7+ZV7AF4EoWQt0CMaQRspI3QUqGnGDOPFNvt8DLMQm4Xdq0/xZqh037sOA23OmpBOxwicP15hbYeSqW3aDnvBbTtHCaFt7TtNCHPaaA4TPpEkBI2ft9iPNTSIgYfNLYnoSdnlSOZ2iYbUvBmzG9L8mhZULsg5HwqRzHdeS3e0Ys30BeIZp3nTLctKprxJwP0ljeXGv1GirLC/Aa6MIYgPo4s0Op3bCaCY1p2hvd1iZyaenPGa/ULYVdwTbqxd+D6EzL5dQxTB3DtTuGQ/St2m7opxCcQvC6Iej7w1eOk8QxDkADBdKF7VtHs1FoA7NeH0tKZAss4tSXIMOiDCCUVU5OtS8CUpTFpDpIpiAEbEDRPB4UE/fsUTGIQZV0X5HGgCghYmNr12iuOvPp7SO7DtxGs8XZVRX+cnZVRfKuOR6Fj+4C9Uv1itV6v1MxFnTN/vcwG7rWnAyuMEaP5wszYcdnLtsFDFqRFHOz/+oOImqpetHjELnma6F/nvNeS2WC4gs03aIJh+3FAK9+nP3VCzvYKsTu92Pc0GovB32mWPMGerSvU7fD9YwYJyxvXuyM1y8LrYZPPXVJN5b5+cDHTA7iQydf5Eeid6HVuSCgvfmj2L7/QWwxJpaQGuFEFCe+H81DD1NeP6cECWrNa3eyh9f69qvl4B7elyTL1TKv/tKk2+fa+d7sb8vHV+Om4Aa6TjWfR48UvfDfyXQLdHa7fwEhtg6y
</script>
