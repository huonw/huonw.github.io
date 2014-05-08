var make_toc_entry = function(id, text, level, depth) {
    var link = $("<a/>").attr("href","#"+id).html(text);

    return $("<li/>").attr("id", "toc-" + id).attr("class","toc-level" + level + " toc-depth"+depth).html(link);
};

var make_toc = function(element, from, to, section) {
    from = from || 1;
    to = to || 3;

    var to_select = [];
    for (var i = from; i <= to; i++) {
        to_select.push("h"+i);
    }
    to_select = to_select.join(",");

    var headings = section ?
            $(to_select, section) : $(to_select);

    var list = element, lastlevel, level, cur,depth = 0, prev;
    for (var i = 0, l = headings.length; i < l; i++) {
        cur = headings[i];
        level = parseInt(cur.tagName.slice(1));

        while (level < lastlevel && list) {
            list = list.parent().closest("ol");
            lastlevel--;
            depth--;
        }

        if (lastlevel && level != lastlevel) {
            list = $("<ol/>").appendTo(list.children().last());
            depth++;
        }
        else if (prev) {
            prev.addClass("toc-leaf");
        }

        make_toc_entry(cur.id, cur.innerHTML, level, depth).appendTo(list);

        lastlevel = level;
    }

    return headings.length;
};
