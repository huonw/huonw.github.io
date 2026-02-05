---
layout: default
title: "Mechanical sympathy for QR codes: making NSW check-in better"

description: >-
    QR codes are now critical infrastructure here in NSW, Australia. Let's learn how to make them better.

hashtags: []
comments:

hero_image: hero.png

style: >-
  svg, figure img {
    filter:
      drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.8));
  }
  figure img {
    padding-bottom: 8px;
  }
  .hovering-text-poster, .hovering-text-qr {
    text-decoration: none !important;
    text-anchor: middle;
    font-weight: bold;
    font-size: 90px;
    letter-spacing: 3px;
    stroke: black;
  }
  .hovering-text-poster {
    transform: translate(297.5px, 800px);
    stroke-width: 10px;
    paint-order: stroke;
  }
  .hovering-text-qr {
    transform: translate(433px, 800px);
    stroke-width: 16px;
    paint-order: stroke;
  }
  .big {
    font-size: 180px;
  }
  .bad { fill: #f66; }
  .okay { fill: #fa0; }
  .good { fill: #8f8; }

  .qr-poster-new {
    transform: translate(70.696px, 152.079px) scale(0.453543);
  }
  .qr-poster-original {
    transform: translate(227.127px, 305.983px) scale(0.142161);
  }
  .poster-switch-checkbox:checked + label + svg .switchable-qr.qr-poster-new {
    transform: translate(194.196px, 152.079px) scale(0.453543);
  }
  .poster-switch-checkbox:checked + label + svg .switchable-qr.qr-poster-original {
    transform: translate(350.627px, 305.983px) scale(0.142161);
  }
  .switchable-qr, .switchable-poster {
    transition: all ease-out 0.5s;
  }
  @media (prefers-reduced-motion) {
    .switchable-qr, .switchable-poster { transition: none; }
  }
  /* svg animations look really bad in safari https://browserstrangeness.github.io/css_hacks.html#safari */
  @supports (-webkit-hyphens:none) {
    .switchable-qr, .switchable-poster { transition: none; }
  }
  .switchable-qr {
    transform: translate(6px, 6px) scale(0.83);
  }
  .switchable-poster {
    opacity: 0%;
    filter: blur(100px);
    transform: translate(-256.9px, -349.4px) scale(1.83) ;
  }
  .poster-switch-checkbox:checked + label + svg .switchable-poster {
    opacity: 100%;
    filter: blur(0px);
    transform: scale(1);
  }

  .poster-switch-checkbox {
    display: none;
  }
  .poster-switch-label {
    display: block;

    font-size: 0.75em;
    text-align: center;
    width: 12em;
    line-height: 2em;
    margin: 0 0 4px auto;

    cursor: pointer;
    border: 2px solid black;
    border-radius: 5px;
  }
  .poster-switch-codes, .poster-switch-checkbox:checked + label .poster-switch-posters {
    display: none;
  }
  .poster-switch-posters, .poster-switch-checkbox:checked + label .poster-switch-codes {
    display: inline;
  }

---

Governments here in Australia have been telling us to keep distance from each other. Surprisingly, the same government has simultaneously put out posters that required people to get close, unnecessarily. They contain QR codes for contact-tracing check-ins that are small and dense, meaning they're hard to scan. How could they be better?


Here's how:

{% capture extra %}
<text class="hovering-text-poster bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-poster good" dx="619" filter="url(#blur-text)">works now</text>
<text class="hovering-text-poster okay" dx="1238" filter="url(#blur-text)">optimised</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original qr-code-v11-Q-works-in-app qr-code-v05-Q-optimized-offline"
  alt="Three pages placed horizontally. They all contain a 'we're covid safe' logo, text like 'please check in before entering our premises.' and a QR code. The left-most one labelled 'original' in red has a very small QR and dense code; the centre one labelled 'works now' in green has a much larger QR code that's slightly less dense; the right-most one labelled 'with planning' in orange also has a large QR code, that is much less dense."
  link="qr-poster-comparison-three.png"
  extra=extra
%}

The central one labelled "works now" could be rolled out right now. The existing native app **can understand that poster**, so if the NSW government switched to issuing something like that, life is magically easier for everyone. The "optimised" poster shows what could've been, if the QR code was optimised to the extreme, when the feature was initially deployed into the app.

In this article, we'll walk through how to get to that point, touching on:

- the contents of the current check-in QR codes and how they function
- the workings of QR codes in general (error correction, versions and encoding modes)
- a walk-through of optimising the data stored in a QR code
- the security of these QR codes

Let's learn some general lessons for using/designing QR codes by looking at this specific example.

<aside data-icon="⚠️">

There's been a lot written about whether these QR codes/contact tracing is government overreach and about the governmental response to the pandemic more generally, and I am not adding to that here: these QR codes serve as an easy example of the technology.

</aside>

## What are you writing about?

Almost every shopfront here in NSW and even across Australia has an A4 page with a QR code hidden in it. Customers entering need to scan to register their presence for contact tracing, which (if they've installed it) pushes them into the Service NSW app. The design is clever in some ways, but seemingly not so clever in other ways.


{% capture extra %}
<image x="866" height="842" width="474" xlink:href="service-nsw-scan.png" href="service-nsw-scan.png" />
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr"
  caption="The check-in poster and the view of the Service NSW app after scanning it. [Tap to view the poster alone (PDF)](qr-poster-original.pdf)."
  alt="An image with two panels. On the left, a page as above with text like 'please check in before entering our premises'. On the right, a screenshot of a mobile app: the page is titled 'COVID Safe Check-in', there's an info box saying 'Checking in to Test NSW Government QR code'  "
  link="qr-poster-original.pdf"
  trailing_width="474"
  extra=extra
  show_switch="0"
  switch_on_by_default=true
%}

The QR code encodes a rather long URL: [`https://www.service.nsw.gov.au/campaign/service-nsw-mobile-app?data=eyJ0IjoiY292aWQxOV9idXNpbmVzcyIsImJpZCI6IjEyMTMyMSIsImJuYW1lIjoiVGVzdCBOU1cgR292ZXJubWVudCBRUiBjb2RlIiwiYmFkZHJlc3MiOiJCdXNpbmVzcyBhZGRyZXNzIGdvZXMgaGVyZSAifQ==`{:.break-all}][url].

To fit all this in, it has to be dense: it has 81 modules (little squares) along each side, meaning it's version 16.

<aside data-icon="ℹ️">

QR codes come in 40 different sizes, called <strong>versions</strong>, starting with only 21 modules along each side at version 1 and increasing by four for each version: 25 for version 2, 29 for version 3, …, up to 177 for version 40.

</aside>

The `eyJ0…fQ==` value of the `data` parameter looks like it might be encoded with [base64](https://en.wikipedia.org/wiki/Base64), and indeed, if we try decoding it under that assumption, we find some structured JSON:

{% highlight json linenos %}
{
  "t": "covid19_business",
  "bid": "121321",
  "bname": "Test NSW Government QR code",
  "baddress": "Business address goes here "
}
{% endhighlight %}

[url]: https://www.service.nsw.gov.au/campaign/service-nsw-mobile-app?data=eyJ0IjoiY292aWQxOV9idXNpbmVzcyIsImJpZCI6IjEyMTMyMSIsImJuYW1lIjoiVGVzdCBOU1cgR292ZXJubWVudCBRUiBjb2RlIiwiYmFkZHJlc3MiOiJCdXNpbmVzcyBhZGRyZXNzIGdvZXMgaGVyZSAifQ==

Putting those keys into words, we can guess that each QR code tells us:

- `t`: it's a COVID-19 check-in code
- `bid`: an identifier for the business
- `bname`: the business name
- `baddress`: the business address (this is a test QR code, but in real QR codes it looks something like "123 Street, Suburb NSW")

## Evaluation

These QR code posters have some great attributes:

1. They **exist** at all: the contact tracing situation was a mess until the Service NSW codes were rolled out and made mandatory. Some venues would require hand written entries, others would require entering personal information into random websites (of varying ease-of-use). Now, it's a single app that remembers your details.
2. **Using a URL** (rather than just raw data) means they can be usefully interpreted by any scanner, such as a phone's camera, rather than requiring scanning with a specific app.
4. There's a native app that could theoretically be used to do an **offline check-in** when there's no internet access, for later syncing... although this doesn't actually work in practice, with the current app. The QR code contains enough info to still **display a confirmation** to the user, so they know they scanned what they expected.
4. The use of **high error correction** means they're theoretically resilient to 'damage', like reflections off lamination or windows, or even dirt and holes.
5. The poster **explains** how to scan the code (it seems unthinkable now, but these codes were introduced into a world where QR codes were _not_ instantly recognisable).

{% include image.html src="service-nsw-scan-header.png" width="800" height="392" alt="An image containing a crop of only the top region of the Service NSW app screenshot above. It focuses on the page title 'COVID Safe Check-in' and a box that says 'Checking in to Test NSW Government QR code' and 'Not the right venue? scan again'." caption="The Service NSW app shows the venue name when checking in, even offline." %}


On the other hand, they could be better:

1. The QR code is physically tiny.
2. Using the highest level of error correction might be taking things a little far.
3. The URL could be formatted better to take advantage of how QR codes are constructed.
4. There's unnecessary data stored in the URL.
5. The URL could be much shorter overall.

Let's go through these, and see what difference they can make. We'll ignore the realities of actually implementing these in the context of a real and existing app/infrastructure, which can change the appropriate technical decisions dramatically.

## Bigger QR code

The QR code is small in the poster. When printed at the default A4[^a4], it's only ~5cm (2 inches) on each side, which means about **less than 5%** of the total page area is QR code, but that's what people need to interact with.

[^a4]: The page is nominally A4, but I've seen some instances where the scaling has been mixed up, and the "poster" is printed at A5 or smaller (on an A4 page). This is really hard to scan, especially when placed behind (reflective) glass in an outdoor shop window.

Making it larger would make it much easier to scan, and doesn't change anything about the QR code itself, so will definitely continue to work with the existing app. I imagine that most people in NSW are familiar with how to use the codes now, so the instructions could be de-emphasised.

I did some really quick shuffling and resizing of the page elements, without editing or reflowing text (just deleting the blue box around the code[^quiet-zone]), and it's definitely possible to have the code be bigger. It could be even larger still with a little more editing elbow-grease applied.

[^quiet-zone]: Deleting the blue box and particularly the region of white within it sacrifices the "quiet zone": QR codes are meant to be surrounded by a zone of simple background four modules wide. However, this ends up being a lot of overhead, and [doesn't seem to be necessary in practice][quiet].

{% capture extra %}
<text class="hovering-text-poster bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-poster good" dx="619" filter="url(#blur-text)">rearranged</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original qr-code-v16-H-original"
  alt="Two pages placed horizontally. As above, they both contain a 'we're covid safe' logo, text like 'please check in before entering our premises.' and a QR code. The left-most one labelled 'original' has a very small QR and dense code; the right one labelled 'rearranged' has a much larger QR code with the surrounding text rearranged slightly."
  extra=extra
%}

When printed on an A4 page, the code in the new version is 16cm on each side, more than three times larger, and so can probably be scanned from **three times further away**. It now consumes ~40% of the page area.

(After publishing, [several][person1] [people][person2] pointed out that truly huge QR codes seem to cause difficulties with scanning in practice in some cases. One would need to actually test the design in practice to validate a particular size.)

[person1]: https://news.ycombinator.com/item?id=28847827
[person2]: https://twitter.com/nickzoic/status/1448429172242587649

[quiet]: https://qrworld.wordpress.com/2011/08/09/the-quiet-zone/

## Better QR code

We've done the easiest step of making the QR larger, let's now make the QR code within the overall poster better. Here's the sequence of changes we'll apply, moving from left to right and top to bottom. The codes get simpler, with larger modules (little squares), and thus become easier to scan.

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">error correction Q</text>
<text class="hovering-text-qr okay" dx="1732" filter="url(#blur-text)">remove address</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v13-Q-original:qr qr-code-v11-Q-works-in-app:qr"
  alt="Three QR codes placed horizontally. They get less dense from left to right, and are labelled: 'original' in red, 'error correction Q' in orange, 'without address' in orange."
  extra=extra
%}
{% capture extra %}
<text class="hovering-text-qr okay" dx="0" filter="url(#blur-text)">better encoding</text>
<text class="hovering-text-qr good" dx="866" filter="url(#blur-text)">short path</text>
<text class="hovering-text-qr okay" dx="1732" filter="url(#blur-text)">remove name</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="qr-code-v07-Q-path-encoding:qr qr-code-v05-Q-short-path:qr qr-code-v02-Q-optimized-tiny:qr"
  alt="Three QR codes placed horizontally. They get less dense from left to right, and are labelled: 'better encoding' in orange, 'short path' in green, 'remove name' in orange, "
  extra=extra
%}

We'll see how the "short path" QR code in green retains all of the valuable properties we identified above, including simple offline check-in support. The "remove name" code is even simpler, and is what is possible if we compromise offline check-ins nicely.

### Less error correction

The QR code uses the highest error correction (EC) level: H. As explored in [*QR error correction helps and hinders scanning*][qr-error-correction], there's four levels of error correction, and they correspond to how many modules can be corrupted and still have the QR code scannable. They also influence how much data can be stored:

[qr-error-correction]: {% post_url 2021-09-28-qr-error-correction %}

<div class="table-wrapper" markdown="1">

| EC level     | max damage | data storage (vs. L) |
|--------------|-----------:|---------------------:|
| H (high)     |        30% |                  43% |
| Q (quartile) |        25% |                  57% |
| M (medium)   |        15% |                  79% |
| L (low)      |         7% |                 100% |

</div>

I imagine that most codes are placed in relatively non-hostile environments (indoors, or at least under cover), so the use of EC level H could be reduced, or made configurable. Dropping down one level, to Q, reduces the version from 16 to 13, making each module (small square) larger&mdash;17% more area&mdash;and thus the overall QR code easier to scan.

Dropping further makes the modules larger, although the biggest win comes from moving from H to Q, and each lower level is less resilient.

<div class="table-wrapper" markdown="1">

| EC level | version | module size (vs. H) | vs. previous |
|----------|--------:|--------------------:|-------------:|
| H        |      16 |                   - |            - |
| Q        |      13 |                +17% |         +17% |
| M        |      11 |                +33% |         +13% |
| L        |      9 |                +53% |          +15% |

</div>

This also doesn't change anything about the data that is encoded, and so should continue to work with the existing app.

We do want these codes to be reasonably resilient to damage, so let's **choose Q**.

{% capture extra %}
<text class="hovering-text-qr bad big" dx="0" filter="url(#blur-text)">H</text>
<text class="hovering-text-qr good big" dx="866" filter="url(#blur-text)">Q</text>
<text class="hovering-text-qr okay big" dx="1732" filter="url(#blur-text)">M</text>
<text class="hovering-text-qr okay big" dx="2598" filter="url(#blur-text)">L</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="qr-code-v16-H-original:qr qr-code-v13-Q-original:qr qr-code-v11-M-original:qr qr-code-v09-L-original:qr"
  alt="Four QR codes placed horizontally. They get less dense from left to right, and are labelled: H in red, Q in green, M in orange and L in orange."
  extra=extra
  show_switch="1"
%}

### Structure of the URL

We've done the easiest parts, now we need to actually think about the data encoded in the QR code. Less data means a smaller version, which means larger modules and thus easier scanning. This QR code stores a URL that contains a large base64 JSON snippet. We can optimise in a few ways, some of which seem to work with existing apps, and some which don't. We can look at the parts of the URL independently:

1. **scheme**: `https://`
1. **domain**: `www.service.nsw.gov.au`
2. **path**: `campaign/service-nsw-mobile-app`
3. **query**: `data=eyJ0IjoiY292aWQxOV9idXNpbmVzcyIsImJpZCI6IjEyMTMyMSIsImJuYW1lIjoiVGVzdCBOU1cgR292ZXJubWVudCBRUiBjb2RlIiwiYmFkZHJlc3MiOiJCdXNpbmVzcyBhZGRyZXNzIGdvZXMgaGVyZSAifQ==`{:.break-all}

The simplest part to look at is the scheme, because there's two options `https://` and old-school `http://`: we could save a character but it doesn't seem worth dropping the encryption. Let's leave it, and **choose `https://`**.

### Less data: remove unnecessary information

The lowest hanging fruit for actual change is in 4, the query. This query is currently a single parameter `data` with value base64-encoded JSON value `eyJ0…fQ==` . The JSON includes a `baddress` field... I **cannot find any place** in the app or website that displays this, and indeed removing it seems to function just fine. The resulting encoded JSON is `eyJ0IjoiY292aWQxOV9idXNpbmVzcyIsImJpZCI6IjEyMTMyMSIsImJuYW1lIjoiVGVzdCBOU1cgR292ZXJubWVudCBRUiBjb2RlIn0=`{:.break-all}, which is 104 characters, down from 160.

<div class="table-wrapper" markdown="1">

| JSON value                     | URL length | version at Q |
|--------------------------|-----------:|-------------:|
| Original with `baddress` |        228 |           13 |
| New without `baddress`   |        172 |           11 |

</div>

Sounds good. Let's **choose to remove the `baddress` field**.

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">previous</text>
<text class="hovering-text-qr good" dx="1732" filter="url(#blur-text)">remove address</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v13-Q-original:qr qr-code-v11-Q-works-in-app:qr"
  alt="Three QR codes placed horizontally. The left two labelled 'original' and 'previous' have denser patterns than the right one labelled 'remove address'."
  extra=extra
  show_switch="2"
%}

### Modes: upper-casing

QR codes encode the data in one of [four modes][modes], based on the characters that the data contains:

<div class="table-wrapper" markdown="1">

| Mode         | Permitted characters      | Bits per character |
|--------------|---------------------------|-------------------:|
| Numeric      | 0123456789                |               3.33 |
| Alphanumeric | 0–9, A–Z, space, $%*+-./: |                5.5 |
| Binary       | any byte                  |                  8 |
| Kanji        | [Shift JIS X 0208][x0208] |                 13 |

</div>

[modes]: https://en.wikipedia.org/wiki/QR_code#Storage
[x0208]: https://en.wikipedia.org/wiki/JIS_X_0208

Lower bits per character is better: it means we can fit more characters in a given space. Most data in URL QR codes will use the Binary mode, because there will typically be lowercase letters, but we can do better using the Alphanumeric one: a lot of components of a URL can be upper case without causing issues or changing the behaviour. For instance, the domain name is case-insensitive, and a lot of servers treat the path case-insensitively too. Base64 encoding is case-sensitive so we cannot upper-case.

Fortunately, QR codes can encode the data **in multiple segments with different modes**[^optimal], so we can still benefit from this: the first part can be encoded in Alphanumeric, while the second part with the base64 value can be Binary.

[^optimal]: Choosing the best segmentation is an interesting optimisation problem, because each segment has some overhead via a header, so it's better to encode something like `A1b` as one Binary segment to only pay for the header once, rather than three segments (`A` Alphanumeric, `1` Numeric, `b` Binary) which requires three headers. [*Optimal text segmentation for QR codes*][optimal] explores this and even provides a live demo.

[optimal]: https://www.nayuki.io/page/optimal-text-segmentation-for-qr-codes

<div class="table-wrapper" markdown="1">

| url                                                                                                                       | works with app | L |  Q |
|---------------------------------------------------------------------------------------------------------------------------|---------------:|--:|---:|
| Original:<br/>`https://www.service.nsw.gov.au/campaign/service-nsw-mobile-app?data=eyJ…`{:.break-all}                     |            yes | 8 | 11 |
| Upper-case domain and scheme:<br/>`HTTPS://WWW.SERVICE.NSW.GOV.AU/campaign/service-nsw-mobile-app?data=eyJ…`{:.break-all} |            yes | 8 | 11 |
| Only data lower-case:<br/>`HTTPS://WWW.SERVICE.NSW.GOV.AU/CAMPAIGN/SERVICE-NSW-MOBILE-APP?DATA=eyJ…`{:.break-all}         |             no | 7 | 11 |

</div>

The second option&mdash;upper-casing only the domain and scheme&mdash;is as far as we get and still (seemingly) **work with existing app installations**.

The upper-casing of that option doesn't happen to make a difference for the data we have here, although it does reduce the number of bits required total, so it may make a difference for some businesses where their name/ID happens to push them just above a version boundary.

The last option&mdash;upper-casing everything except for the base64 value&mdash;also doesn't make much difference at our chosen error correction level Q, but it does at others like L.

Since we're at the limit, we're now going off into the world of imagination, where bureaucracy is made up and existing users don't matter. So let's **lock in the last one**.

### Less data: encode better

Our URL now looks like: `HTTPS://WWW.SERVICE.NSW.GOV.AU/CAMPAIGN/SERVICE-NSW-MOBILE-APP?DATA=eyJ0IjoiY292aWQxOV9idXNpbmVzcyIsImJpZCI6IjEyMTMyMSIsImJuYW1lIjoiVGVzdCBOU1cgR292ZXJubWVudCBRUiBjb2RlIn0=`{:.break-all}.

The base64 JSON value `eyJ0…In0=` looks like it's still worth thinking about: it now contains less data, but it's still takes 70% of the storage in the QR code (880 bits out of 1256 total). It's stored in the URL in a `?DATA=` query parameter, and the data it contains is:

{% highlight json linenos %}
{
  "t": "covid19_business",
  "bid": "121321",
  "bname": "Test NSW Government QR code",
}
{% endhighlight %}

Unfortunately there's a lot of overhead from JSON (all the `{":,`s), and then even more overhead from base64.

We can do better, because we've got simple textual data and simple values (plain strings). This means that we could pass the values in the URL directly, either via a query parameters, or in the path directly, which saves us a little overhead of `?N=…`. We've already got the `/C` in the URL to indicate a check-in, so we can probably drop the `"t": "covid19_business"`, and our scheme here is very hand-crafted, so we can optimise the parameters down as much as we like.

<div class="table-wrapper" markdown="1">

| encoding                                                                         | length |  Q |
|----------------------------------------------------------------------------------|-------:|---:|
| Original, JSON + Base64:<br/>`...?DATA=eyJ0…`{:.break-all}                       |    172 | 11 |
| URL parameters:<br/>`...?T=COVID19_BUSINESS&BID=121321&BNAME=name…`{:.break-all} |    126 |  8 |
| Better URL parameters:<br/>`...?I=121321&N=name…`{:.break-all}                   |    101 |  7 |
| ID in path:<br/>`.../121321&N=name…`{:.break-all}                                |     99 |  7 |
| Everything in path:<br/>`.../121321/name…`{:.break-all}                          |     67 |  7 |

</div>

This makes a huge difference. Our URL is now down to 97 characters (from 228 originally): `HTTPS://WWW.SERVICE.NSW.GOV.AU/CAMPAIGN/SERVICE-NSW-MOBILE-APP/121321/Test+NSW+Government+QR+code`{:.break-all}.

Let's lock that last option in, **choosing to encode things efficiently in the path**.

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">previous</text>
<text class="hovering-text-qr good" dx="1732" filter="url(#blur-text)">better encoding</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v11-Q-works-in-app:qr qr-code-v07-Q-path-encoding:qr"
  alt="Three QR codes placed horizontally. The left two labelled 'original' and 'previous' have denser patterns than the right one labelled 'better encoding'."
  extra=extra
  show_switch="4"
%}

Look at how much simpler that QR code is.

### Less data: a better path

Next, the initial `CAMPAIGN/SERVICE-NSW-MOBILE-APP` components of the path are rather long... do we really need to spell out "campaign" and "mobile app"? At least it's not "mobile telephone application"!

Let's just cut that down. There's two nice options here: no path at all, or a very short one.

<div class="table-wrapper" markdown="1">

| path                                                    | length |  Q |
|---------------------------------------------------------|-------:|---:|
| Original `CAMPAIGN/SERVICE-NSW-MOBILE-APP`{:.break-all} |    97 | 7 |
| `C`                                                     |    67 | 5 |
| Empty                                                   |    65 | 5 |

</div>

There's not much difference here, so it feels better to include the `C` to distinguish when a link is for a check-in. If the path is empty, the URL looks like `HTTPS://WWW.SERVICE.NSW.GOV.AU/121321/...`{:.break-all}, which means the front page of `HTTPS://WWW.SERVICE.NSW.GOV.AU`{:.break-all} needs to be detecting whether the path looks like a check-in ID and redirect to the appropriate page (when loaded in a web browser), and that sounds annoying and would require relatively unusual code.

Let's choose this **short single-character path**.

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">previous</text>
<text class="hovering-text-qr good" dx="1732" filter="url(#blur-text)">shorter path</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v07-Q-path-encoding:qr qr-code-v05-Q-short-path:qr"
  alt="Three QR codes placed horizontally. The left two labelled 'original' and 'previous' have denser patterns than the right one labelled 'shorter path'."
  extra=extra
  show_switch="5"
%}

### Less data: better domain

The domain being used is long: `WWW.SERVICE.NSW.GOV.AU`{:.break-all}. We definitely don't need to be spelling that all out. There's a variety of options here: shortenings of the current URL like `Q.SERVICE.NSW.GOV.AU`{:.break-all} or `S.NSW.GOV.AU`; or something really short, like `NSW.AU` (this domain doesn't exist, but any 6 character domain would be equivalent). The best choice probably depends on the bureaucracy and dev/sys-ops requirements with the relevant organisations.

<div class="table-wrapper" markdown="1">

| domain                                             | length | L | Q |
|----------------------------------------------------|-------:|--:|--:|
| Original<br/>`WWW.SERVICE.NSW.GOV.AU`{:.break-all} |     67 | 4 | 5 |
| `Q.SERVICE.NSW.GOV.AU`{:.break-all}                |     65 | 4 | 5 |
| `S.NSW.GOV.AU`{:.break-all}                        |     57 | 3 | 5 |
| `NSW.AU`{:.break-all}                              |     51 | 3 | 4 |

</div>

Most of these choices don't a difference at level Q, but they do reduce the overall data (and thus may make a difference in some cases) and reduce the version at level L. Let's **choose `S.NSW.GOV.AU`**, because being scoped within the `GOV.AU` second-level domain seems more trustworthy: `HTTPS://S.NSW.GOV.AU/C/121321/Test+NSW+Government+QR+code`{:.break-all}.

This 57-character URL still contains all the same useful information as the original 228-character one. Here's the four pieces of data that were in the JSON snippet:

- `"t": "covid19_business"` &rArr; `/C/` in the path
- `"bid": "121321"` &rArr; first path parameter
- `"bname": "Test NSW Government QR code"` &rArr; second path parameter
- `"baddress": "…"` &rArr; removed, because it is not used

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">previous</text>
<text class="hovering-text-qr good" dx="1732" filter="url(#blur-text)">better domain</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v05-Q-short-path:qr qr-code-v05-Q-optimized-offline:qr"
  alt="Three QR codes placed horizontally. The left one labelled 'original' has denser patterns than the right two labelled 'previous' and 'better domain'."
  extra=extra
  show_switch="6"
%}

These final two QR codes look similar because they're both version 5; the density and size of modules hasn't changed, but their exact arrangement has.

### Reducing offline support

We're pretty much at the limit of what is possible when the URL includes the business name to enable offline check-ins[^compression]. What if we drop the requirement to encode this? For instance, the app could say "you're checking into a business" rather than show the name for confirmation, or even have the app stores its own database mapping IDs to business names[^database].

If we do that, the URL can be 29 characters: `HTTPS://S.NSW.GOV.AU/C/121321`{:.break-all}. This fits in a version 2 QR code!

[^compression]: There's probably a lot of redundancy in the business names, like many that include "Pty Ltd", "Cafe" or even "Australia". One could potentially see some benefits by compressing them (and then encode the resulting binary output with base64 or similar again), especially using a compression method that can use a custom dictionary, to capture all 'unusual' commonalities among these business names.

[^database]: Having the app manage a database brings a whole variety of exciting issues since presumably it'll need to handle updates, and it may be relatively large. These can be solved, but it's not nearly as easy as just grabbing the name out of the URL itself.

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">previous</text>
<text class="hovering-text-qr good" dx="1732" filter="url(#blur-text)">without name</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v05-Q-optimized-offline:qr qr-code-v02-Q-optimized-tiny:qr"
  alt="Three QR codes placed horizontally. The left two labelled 'original' and 'previous' have denser patterns than the right one labelled 'without name'."
  extra=extra
  show_switch="7"
%}

(@dhsysusbsjsi on the orange site [points out][hn] that one can even get to version 1, with some further tweaks, but these do require dropping error correction further, to L or M.)

[hn]: https://news.ycombinator.com/item?id=28691747

## Is this hacking? Do the changes lose security?

**No**. The current NSW QR codes are **inherently insecure**, and none of the changes we've walk through make them more or less secure.

There's lots of people who will have the skills to pull them apart and generate new ones with different values for the business ID, name or address. The base64 encoding is **not encryption**, because there's no secret key/password required to encode or decode it. Base64 is a very common way to store and communicate data on the internet, to the point that some people would likely even instantly recognise the three character prefix `eyJ` as "this is base64'd JSON".

One way to make these secure[^threat-model] would be to **cryptographically sign** the URLs, adding extra information that is computed from the data using a secret key held by Service NSW. When loading the URL for a check-in, the app validates that the signature matches. If someone tries to tamper with the data, they'll need to update the signature, but without knowing the key, they'll need a *very* lucky guess.

[^threat-model]: When talking about security, one should have an understanding of what the attack is being secured against. In this case, we're securing against creating a QR code with a changed business ID or name, to deceive people into thinking they're checking into venue A, when they're actually checking into venue B. This may not actually be a particular concern.

For instance, a 200 bit [BLS signature][bls] may give sufficient security. To get a sense of the overhead this might impose, we can pretend we've generated a signature of this size somehow and add it to the URL (this **isn't** a real cryptographic protocol, don't take my word for it). First, encode it as a 61 digit number to benefit from the Numeric QR mode, and, then, add it as an extra query parameter `…?…&S=16069…`. This does make the URLs longer, and thus requires higher versions, but our optimisations have made room for this, meaning that the QR codes are still easier to scan while having better security:

<div class="table-wrapper" markdown="1">

| QR code           | unsigned version | signed version |
|-------------------|-----------------:|---------------:|
| original          |               16 |             17 |
| optimised for app |               11 |             12 |
| fully optimised   |                5 |              7 |

</div>

[bls]: https://en.wikipedia.org/wiki/BLS_digital_signature

{% capture extra %}
<text class="hovering-text-qr bad" dx="0" filter="url(#blur-text)">original, unsigned</text>
<text class="hovering-text-qr okay" dx="866" filter="url(#blur-text)">unsigned</text>
<text class="hovering-text-qr good" dx="1732" filter="url(#blur-text)">signed</text>
{% endcapture %}
{% include blog/nsw-covid-qr/qr-figure.html
  qrs="original:qr qr-code-v05-Q-optimized-offline:qr qr-code-v07-Q-signed:qr"
  alt="Three QR codes placed horizontally. The left two labelled are labelled 'original' and 'insecure', while the right one is labelled 'signed'. The right one is slightly denser than the center, but much less dense than the first."
  extra=extra
  show_switch="8"
%}

## Other states

Every other state in Australia has a similar check-in process, including apps and QR codes on posters. Most of these use simpler QR codes than NSW, but they make other trade-offs:

- South Australia and Victoria include the venue name, and thus potentially nicely support offline check-ins too. However, SA definitely requires internet to check-in, and I'm unsure about Victoria.
- Victoria and Western Australia seem to have real security in their QR codes (for instance, WA uses a [JSON Web Token][jwt], which includes a cryptographic signature, however, [it was pointed out][symm] that the choice of a symmetric signature makes the value questionable).
- ACT, Queensland, Northern Territory and Tasmania all have essentially the same app and QR codes, and use efficient URLs (with a lot of Numeric data), but have some seemingly unnecessary redundancy.
- Most states use error correction level Q, but Victoria and Western Australia drop one level to M: it's probably not a coincidence these two states also have the longest URLs, similar to or longer than the NSW URLs.

[jwt]: https://jwt.io/
[symm]: https://twitter.com/JamesHenstridge/status/1448516012379238404

## What did we learn?

Throughout this article we've stepped through a process of optimising QR codes for the real world, by looking at the check-in posters used here in NSW. We turned those posters into something that would be much easier to use, and in the process touched on:

- the contents of the current check-in QR codes and how they function
- the workings of QR codes in general (error correction, versions and encoding modes)
- a walk-through of optimising the data stored in a QR code, moving from version 16 to version 5 **without compromising functionality**
- the security of these QR codes, observing how it's possible to **improve security** and have codes that are still easier to scan

We didn't consider the realities of actually implementing these, within an existing app and/or support infrastructure. The appropriate technical trade-off can change dramatically.

{% include comments.html c=page.comments h=page.hashtags %}


{% include blog/nsw-covid-qr/qr-poster-defs.svg %}
