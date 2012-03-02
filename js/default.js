$(function() {
    var ftns = $('.footnote'),
        content = $("#content"),
        url_target = window.location.hash.slice(1);
   
    if (ftns.length) {
        var ftn_div = $("#footnotes"),
            ftn_ol = $("#footnotes-list");
        
        ftns.css({"display":'none'});
        ftn_div.css({"display":"block"});

        ftns.each(function(i) {
            var id = "ftn"+(i+1),
                t = $(this),
                link = $("<a/>",{id: id,
                                 "class": "footnote-counter",
                                 href: "#_" + id}).text("["+(i+1)+"]");
            $("<a/>",{"class":"footnote-return",
                      href:"#"+id,
                      title:"Return to text"}).text("↩").appendTo(t);
            $("<li/>",{id:"_"+id}).html(this.innerHTML).appendTo(ftn_ol);
            t.replaceWith(link);
        });

        // the page may've reflown, so jump to the right place again,
        // if we are at the top of the page
        if (window.scrollY === 0) {
            window.location.hash = url_target;
        }
    }
});