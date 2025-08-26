---
layout: default
title: "Convenient 'Copy as cURL': explicit, executable, editable request replays"

description: >-
    Developer tools in browsers offer a "copy as cURL" function for network requests, giving an executable and editable 'replay' of the request. This is very convenient for sharing and debugging API requests.

not_rust: true

comments:
---

The network tab of a browser's developer tools shows a list of requests. Sometimes there's a problem with one of those requests! Maybe the server is crashing and returning a 500 error, or maybe there's an unexpected 403 permission error. The dev tools UIs provide one-click **"Copy as cURL"** functionality to conveniently extract an executable 'replay' of the request, and it can be easily edited. This makes **communicating** and **debugging** issues with HTTP requests much easier.

Many a time I have had another software engineer ask me "I did $vague_description and it failed", requiring a few rounds of questioning to work out exactly what they did, and exactly what seemed like a failure, and guide them through triaging or debugging the issue. There's a (mild) superpower to get to the debugging, the interesting part of those discussions: recognise when a problem is a problem caused by a HTTP request failing, and habitually capture and share a replay of that request with "Copy as cURL".

Read on to see how to copy, why it's useful, how to work with it, a case study where I used to debug a weird issue, and even some downsides.

{% include image.html src="firefox.png" caption="The Network tab of Firefox's dev tools offers 'Copy as cURL' under the 'Copy Value' option of the context menu for each request." alt="A screenshot of Firefox showing example.com with developer tools open on the 'Network' tab, and the context menu expanded for the request that loads the root HTML page. The 'Copy Value' submenu of the context menu is also expanded, showing options like 'Copy URL', 'Copy as cURL' and others." width="1208" height="938" %}

In all browsers I tried (Firefox, Safari, Chrome, on macOS), doing this means:

1. Open developer tools (aka Browser Tools → Web Developer Tools, DevTools, or Web Inspector).
2. Find the "Network" tab.
3. Trigger the problematic request, by, for instance: reloading, clicking a button, or some other action that causes it.
4. Right-click the relevant row, and "Copy as cURL" (under a "Copy" or "Copy Value" parent option in some browsers).
5. Paste the value into a terminal or script, to start executing it.

"Copy as cURL" gives bulky `curl` CLI invocation that captures almost[^almost] exactly what **the browser sent to the server**, explicitly including all headers, authentication information, and any request data, in a **directly executable** way. Being executable means it can be used to easily replay the request as the browser sent it. The output looks something like:

[^almost]: Why _almost_ exactly? cURL and browsers can differ slightly in [some low-level protocol details](https://github.com/lwthiker/curl-impersonate). Hopefully, you're lucky enough to not encounter bugs at this level!

{% highlight shell linenos %}
curl 'https://example.com/path/goes/here' \
-X 'GET' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: none' \
-H 'Cookie: some=really; long=cookie_that; keeps=going_and_going...' \
-H 'Accept-Encoding: gzip, deflate, br' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Host: example.com' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0' \
-H 'Accept-Language: en-AU,en;q=0.9' \
-H 'Sec-Fetch-Dest: document' \
-H 'Connection: keep-alive'
{% endhighlight %}

<aside data-icon="ℹ️">

cURL CLI cheatsheet: a value by itself without a flag is interpreted as a URL; <code>-X</code>/<code>--request</code> specifies which HTTP method to use; <code>-H</code>/<code>--header</code> specifies a HTTP header (can be specified multiple times); <code>--data-binary</code> or <code>--data-raw</code> also often appear (not shown above) with a chunk of JSON, form, or other data.

</aside>

This makes for:

- **Unambiguous communication** with other people (or your future self) because all the information is right there.
- **Easy edit-run debugging loops** because it is executable and a easily-edited shell script.

I've maintained HTTP APIs, and a `curl` invocation that demonstrates a problem is an **amazing start** in fixing that problem: in most cases, I won't have go ask questions like "which endpoint are you hitting?", "which account are you logged in as?", "which filters are you applying in your search?", or, for internal users, "which environment is this in?". I can immediately dive in and hopefully reproduce it for myself in seconds, and that's the first step to a quick fix.

This isn't just for server problems: if it turns out a **client created an incorrect request** and the server is correctly rejecting it, the `curl` invocation still makes it easier to **identify and discuss** exactly what the client has done wrong, and, again, that's the first step to a quick fix.

## Working with the output

The "copy as cURL" output is a bit idiosyncratic, but with a bit of practice, it's not too hard to work with. Here's some tips:

- Ensure you have a **fast-feedback loop**: so that it's quick to make a change to the cURL invocation, verify if the problem still reproduces, and revert if not.
- Use the line structure to quickly **eliminate or reduce irrelevant arguments and data**.
- Manipulate any `--data-binary`/`--data-raw` arguments to **make the data simpler**.
- If possible, **decode authentication data** to deduce extra information.
- **Adjust** the specifics, like the environment targeted or the exact objects manipulated, for safety or convenience.
- Consider whether other methods of capturing the same information work better for you.

I've found a (informed-)guess-and-check style of debugging to work well here: having a quick edit/run cycle for executing the reproducer is. The `curl` invocations are just a bunch of static data with no dynamic moving parts, so I've found spending a few minutes blasting through dozens of different deletions/tweaks is a productive first step, rather than deeply considering the application-specific symptoms and building intricate harnesses related to them. Once the noise has been removed by that initial step, the deep debugging is usually much easier.

The output has a lot of lines, each ending with the `\` line-continuation character. These lines build up the `curl` invocation and are just split up for convenience, so that each argument and its paired value are alone on their own line. This makes for **easy editing**: once I've verified the reproducer works, I quickly eliminate irrelevant information by **deleting whole lines**. The formatting means there's no need to search for where one string ends and the next starts: bulk whole-line deletion commands work wonders.

If a request has **a request body**, like `POST`ing a JSON blob, there will also be a `--data-binary` or `--data-raw` argument containing that body data. The data may be formatted with a whole lot of distracting `\` escapes. In many cases, like with JSON data, **pretty printing** it and pasting the result back into the shell script as a multi-line string often makes it far nicer to manipulate, without changing the meaning. For instance, using `echo "... json goes here ..." | jq .` to get multi-line output. (There is some warnings: getting the shell quoting correct can take a bit of care, and, in extreme cases, adjusting whitespace may change the behaviour of the request. As always, this is something I'll try, but revert or adjust if it changes behaviour.)

If there's **authentication required**, the authentication credentials can be a blessing and a curse:

- it can provide **useful hints**, like which user was running a request (for instance, the payload of a [JWT][jwt] often has a `sub` claim, that's often a user ID in some form),
- they may **expire**: executing the `curl` command even just minutes or hours after it was first copied may fail due to irrelevant "authentication expired" issues. In my circumstances, I load up our web app, copy fresh credentials, and edit the script to use those new ones instead.

[jwt]: https://www.jwt.io/

If you're unlucky, you'll first see a problem in production, and, Murphy's law says the weirdest problems will occur for a major customer during particularly tense contract renewal negotiations. In this case, it's best to **not replay the exact problematic request**, especially if it is a mutation. In these cases, I edit the script to run against an internal dev environment or a local server, and/or change the specific data to refer to a testing account and entities rather than those of the customer. As always, this may stop the problem reproducing, so I'll test the change and revert or adjust it as required.

Some browsers offer **other ways** to copy an executable version of a request, like "Copy as fetch" or "Copy as PowerShell". These are broadly equivalent to "Copy as cURL", and may be better for your circumstances. They all the same key benefits: unambiguous, complete, and executable.

## Case study: failing redirects

At a previous job, we found that links in notification emails stopped loading for us, but  only in some browsers. These links hit a server for a redirect. Using "copy as cURL" allowed me to **systematically** get to the bottom of it.

Initially, it wasn't obvious **why** the links stopped loading, but the **symptom** was obvious, by looking in the browser dev tools:

- when we saw problematic behaviour, the redirect server responded with a 400 error,
- when we saw normal behaviour, the redirect server responded with a 302 redirect.

Debugging gets easier with such a clear symptom: I already had the network tab open, so I "copy as cURL"'d a problematic request straight into a script I could run locally:

{% highlight shell linenos %}
curl 'https://example.com/path/goes/here' \
-X 'GET' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: none' \
-H 'Cookie: some=really; long=cookie_that; keeps=going_and_going...' \
-H 'Accept-Encoding: gzip, deflate, br' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Host: app.exoflare.io' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15' \
-H 'Accept-Language: en-AU,en;q=0.9' \
-H 'Sec-Fetch-Dest: document' \
-H 'Connection: keep-alive'
{% endhighlight %}

This is very much cut down from the real example, but incorporates the core information I had to work with: a request with a whole bunch of headers, and still no obvious cause. I added the `-i`/`--include` flag to see more information about the server's response and ran the script locally, **all before making any other changes**. Indeed, running the script gave the same unexpected 400 error, just as it does in the browser. I had **verified** that I had a standalone reproducer, and, most crucially, I was ready to edit it.

When I've got an executable example that demonstrates the problem, my usual pattern is a debugging loop to try to get to a **minimal example**, since eliminating all the irrelevant noise often sheds light on the cause. For this specific case, my loop started as:

1. **Delete** one or more headers (or other pieces of data) that might be irrelevant[^bisect].
2. **Run** the request.
3. If the old/bad behaviour **still appears**, the deleted data was apparently not related to the problem and can be left out; if the bad behaviour **disappears**, the deleted data does seem to be related to the problem, so **restore it**.
4. **Repeat** until the example is reduced.

[^bisect]: If there's a lot of data to handle and/or it's completely not obvious what's relevant and what's not, bisecting can work: delete half the lines and see what happens. If the behaviour disappears, restore that half and try deleting the other half. Repeat with the halves of what remains. That said, there's no rules for what to do, and it's best to just start reducing/deleting in some way to make some sort of progress, rather than over-thinking it.

Usually deleting `Sec-Fetch-...`, `User-Agent`, `Accept...` and even `Cookie` (our app doesn't use cookies for authentication) is a safe bet... I started along those lines and found that the cookie value was actually important: I deleted all headers except the `-H 'Cookie: ...` one and the request would still fail, but deleting `Cookie` caused the request to start working. So, it seemed like cookies were impacting the behaviour, leaving me with a request like:

{% highlight shell linenos %}
curl 'https://example.com/path/goes/here' \
-X 'GET' \
-H 'Cookie: some=really; long=cookie_that; keeps=going_and_going...'
#   ^ This cookie is crucial?!
{% endhighlight %}

This was very unexpected! The `Cookie` header just contained some analytics metadata. I didn't expect the redirect server to read them, so why would they change behaviour?

The cause still wasn't obvious, so let's keep reducing to get to a truly minimal example: now on the _value_ of the header. The `Cookie` header expects a value with a particular syntax, describing multiple individual cookies: `name1=value1; name2=value2; ...`. I deleted those cookies one-by-one, and found that one specific cookie seemed to cause the problem. But, the particular cookie name/value pair seemed innocuous: again, why that one?

You know the answer: **keep reducing**.

Now, by cutting out parts of the cookie itself. It was something like `some_cookie=abc,def,...`. I found that truncating the cookie value like `abc,de` still showed the bad behaviour, but `abc,d` worked! This was just "randomly" in the middle of cookie value, not at any sort of obvious boundary.

After a little more futzing around, I deduced that the problem was a server-side limit on maximum total request size: it just happened that the cookie header was very large sometimes, causing the request to be rejected. Using a fake header with big chunk of `a`s showed exactly the same behaviour, with a threshold of the number of `a`s where having one less gives the desired 302 redirect and one more sees the problematic 400 error:

{% highlight shell linenos %}
curl 'https://example.com/path/goes/here' \
-X 'GET' \
-H 'X-DemoHeader: aaaaaaaaaaaaaaaaaaaa...'
{% endhighlight %}

At this point, we've reduced our original "Copy as cURL" script down to an insightful reproducer, and thus we:

- were confident our production users were unaffected (only internal testers would have cookies that large), reducing the panic/urgency,
- immediately identified a short-term workaround to unblock internal users (clear cookies!), and
- started on a real fix (avoid cookies being set in this context).

This debugging process probably took me an hour or so, but would surely have taken me far longer if I didn't have an unambiguous "here's what the full request was" and an easy way to iterate. Who knows how long it would've taken to guess at total request size as a possible cause!

## Downsides

I've encountered two downsides with "copy as cURL":

1. **Sharing of secrets**: the requests may include authentication information (like a JWT or a session cookie), or the request data might have confidential information in it.
2. **Verbosity**: the output can be very large.

I find both of these tolerable, but I do make sure to **explicitly** think about both every time I use and share "copy as cURL".

For **secrets**, I am usually copying a request using a short-lived JWT token in an **internal development environment**. Sharing this sort of secret with colleagues is often perfectly okay: they already have full access to the dev environment, and impersonating me there is pointless. Plus, this sort of token is only valid for an short time, so it quickly becomes completely useless. Thus, my explicit assessment is usually "this is fine".

If it's not fine, like **sharing openly**, I'll look at the values and minimally delete/mutate/replace any confidential parts. However, this risks removing some useful information, like which user is authenticated, and can have other unexpectedly-relevant impacts, like changing the size of the request. Thus, it's always worth a careful evaluation to decide which parts must be changed and which can be retained.

For the **verbosity**, there's two aspects:

- Choosing how to **share** the script in a nice way. Many options are possible, and I'll chose one based where it is being shared:
  - **Paste directly**, if the presentation medium makes that fine (for instance, a code block where very long lines scroll horizontally, instead of wrapping or forcing the page wide).
  - Attach as a **separate file** (for instance, in an email or chat message).
  - **Collapse** it using a `<details> </details>` element in HTML (including some Markdown environments, like GitHub-flavoured markdown).
  - Put it into a **paste-bin** like [Gist](https://gist.github.com) and link to it.
- **Manipulating** it to debug a problem: it takes a bit of practice to get comfortable, but not too much at all. For instance, the "delete a line", "rerun", "restore if required", "repeat" loop described above is a quick habit to build, and usually quickly makes the invocations far more tractable.

## Summary

When there's a problem with how a server is responding to a browser's network request, right-clicking that request in dev tools to "copy as cURL" gives an executable 'replay' of that request. This feature allows me to unambiguously and efficiently **describe** the problem to others, and helps me more easily **debug** it too.

{% include comments.html c=page.comments %}
