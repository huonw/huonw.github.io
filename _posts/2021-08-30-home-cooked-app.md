---
layout: default
title: "The joy of cooking (an app)"

not_rust: true

description: >-
    I've been writing a bunch of code designed to enhance the life of just me and my wife. It's great fun.

comments:
---

Taking shortcuts? Leaving edge-cases unconsidered and unhandled? Is this engineering?! My approach to programming and software engineering has been shaped by years of building [open source][rust] [compilers][swift] and [libraries][stellar], where those edge cases matter, reliability is crucial and flexibility is important. It's been a breath of fresh air to take a step back and stop thinking about every detail, and instead write code that works for a specific set of people: me and my wife.

Early in 2020 (while fires raged, in the before-times), I read [Robin Sloan's *An app can be a home-cooked meal*][sloan] and the idea of code designed for a small group has been rattling around in my head ever since. I can feel the truth in Sloan's writing:

> And, when you free programming from the requirement to be general and professional and scalable, it becomes a different activity altogether, just as cooking at home is really nothing like cooking in a commercial kitchen. I can report to you: not only is this different activity rewarding in almost exactly the same way that cooking for someone you love is rewarding, there’s another feeling, one that persists as you use the app together. I have struggled with words for this, but/and I think it might be the crux of the whole thing:
>
> This messaging app I built for, and with, my family, it won’t change unless we want it to change. There will be no sudden redesign, no flood of ads, no pivot to chase a userbase inscrutable to us. It might go away at some point, but that will be our decision, too. What is this feeling? Independence? Security? Sovereignty?
>
> Is it simply… the feeling of being home?

## The project

I got married last October, and I wanted to have an anticipatory countdown, somehow. We both happen to have Garmin watches, which support custom watch faces[^monkeysee]. I created a simple but fun little app: it shows the time, date and the battery, but also has a photo and a message.

[^monkeysee]: The programming language/environment for the Garmin devices is called "Monkey C", so they took the opportunity to call the compiler "Monkey Do" 🥁

{% include image.html src="screenshots.png" caption="A screenshot of the watch face from Garmin's simulator (left) and on my watch (right), on the birthday of <a href='https://www.instagram.com/corgi_tales/'>Sterling</a> (pictured, excited about a tennis ball)." alt="Two images side-by-side. On the left, a digital rendering of a watch face at 17:24 on 27 December, with the text Happy Birthday, Sterling! across the top. On the right, a photo of the same watch face on a real device" %}

The photo and message changes each day, usually randomly. However, on some special days, it chooses a particular message or photo, like the countdown across the 10 days leading up to our wedding. The photos are synced, so that both of us get the same photo each day[^photo-syncing]. The random messages aren't synced: instead I wrote some for my wife's watch and she for mine. It's nice to wake up each day and see what unexpected combination of photo and message I get.

[^photo-syncing]: The photo for any particular day is chosen by hashing the [Unix time](https://en.wikipedia.org/wiki/Unix_time) of midnight on that day and using this as a "random" index into the list of photos. All these factors (reference time, hashing algorithm, and order of photos) are the same on both watches, so the chosen photo always matches on the two devices.

## "Engineering"

If I was to create a gallery/message app *properly*, there's a whole lot of work required beyond the core "show the watch face" code:

- upload photos and messages for random selection
- associate particular photos and/or messages with particular days (with the possibility for recurrence each month or year)
- potentially, a service to sync the photo order/selection across multiple devices (or, just being careful to put the same photos in the same order on each one)
- message templating, because some messages should say "Happy 1st anniversary" on the first instance, "Happy 2nd anniversary" on the next
- wrapping text nicely, to avoid it overflowing off the edge of the screen, like the example above
- workflow for publishing to an app store, including signing and updating

Instead, I didn't do it properly, because it's an app to run on two and only two devices. I can break all the rules: I can hardcode content, I include private information[^private], I can make assumptions about devices. For instance:

- the app directly embeds all 25 background images[^size]
- our two devices are different models, so the messages for each of us are conditionalised based on the device qualifiers using build system functionality
- those two models are the only ones supported, so a minimal CI that builds for those devices is all that's needed
- the app can be easily sideloaded: plug the watch into a computer and copy the compiled `.prg` file onto it (I think this is a critical component of "home cooking" code: one must have sufficient control over the devices to run arbitrary code, without expensive or complicated processes managed by external corporations)

[^private]: I still wouldn't (and don't) include credentials or other valuable personal information, but I can at least feel free to include sickly sweet messages for my wife.
[^size]: Unsurprisingly, an app containing 25 images ends up as a large artefact, even when they're reduced to the limited fidelity the devices can display (4 or 8 bits per pixel and circles with diameters of 208 or 240 pixels). There doesn't seem to be much documentation, but I can report that watch faces of the following sizes seem to work in practice: 718KB for a Garmin Forerunner 45 (FR45), 1.78MB for a Garmin Forerunner 245 Music (FR245M).

## Open source?

The modern software world is [built on the shoulders of free and open source software][roads-and-bridges]. This project is not even 700 lines of code, and it's still no different: I wrote it in Eclipse, stored it in git (via Emacs and [Magit][magit]), cribbed the toolchain setup for CI from [code published by @jokarls][donkeybrains], and that's ignoring my little Python script for resizing and dithering the images appropriately, and of course skipping over whatever is used by Garmin (and the computer upon which I wrote it, and the internet services I used...).

Unfortunately, I think open sourcing this sort of code removes a large chunk of the freedom that's so glorious. Just as publishing a recipe changes how it is phrased, so too does publishing the source code. I'm comfortable sharing code freely, whatever its state, but I'm not comfortable sharing the private messages I'd write to my wife, or the photos included: without the pressure of openness, I could just place these wherever is convenient.

I'd also prefer to keep these personal project free from the unfortunate negative aspects of published code: my experience with open source is somewhat tainted by the responsibilities of maintainership and the associated guilt, burnout and occasional instances of unpleasant user entitlement.

I'll give back from these sort of "cooking" projects through blog posts, contributions to the tools/libraries used and potentially splitting out small parts, instead of open sourcing the projects themselves.

## Like cooking

I don't generally like cooking that much, except for when I'm cooking with my wife. I get the same immediate and personal sense of fulfillment writing code for (and, in this case, with) her. "Eating" the app on my wrist for months is just icing on top.


[rust]: https://rust-lang.org/
[swift]: https://swift.org/
[stellar]: https://stellargraph.readthedocs.io/en/stable/README.html
[sloan]: https://www.robinsloan.com/notes/home-cooked-app/
[roads-and-bridges]: https://www.fordfoundation.org/work/learning/research-reports/roads-and-bridges-the-unseen-labor-behind-our-digital-infrastructure/
[magit]: https://magit.vc/
[donkeybrains]: https://github.com/jokarls/donkeybrains

{% include comments.html c=page.comments %}
