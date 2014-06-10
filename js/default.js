---
---
$(document).ready(function() {
    /*{ % include footnotes.js % }*/
    {% include toc.js %}

    var url_target = window.location.hash.slice(1),
        content = $("#content"),
        ftns = $(".footnotes"),
        has_ftns = ftns.length > 0,
        toc = $("#toc-list");

    /*if (make_footnotes(ftn_ol, content)) {
        ftns.show();

        has_ftns = true;

        // the page may've reflown, so jump to the right place again,
        // if we are at the top of the page
        if (window.scrollY === 0) {
            window.location.hash = url_target;
        }
    }*/
    if (has_ftns) {
        ftns[0].id = "footnotes";
    }

    if (!window.no_toc && make_toc(toc, 2, 3, content)) {
        $("#toc").show();

        /*if (has_ftns) {
            make_toc_entry("footnotes","Footnotes", 2, 0).appendTo(toc);
        }*/
    }

    var to_unwrap = $(".unwrap");
    to_unwrap.each(function(i){
        var t = $(this);
        t.parent().before(t).remove();
    });
});
