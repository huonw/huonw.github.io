---
---

(function() {
    /*
Copyright (c) 2011 Andrei Mackenzie

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
     */
    // Compute the edit distance between the two given strings
    var getEditDistance = function(a, b){
        if(a.length == 0) return b.length;
        if(b.length == 0) return a.length;

        var matrix = [];

        // increment along the first column of each row
        var i;
        for(i = 0; i <= b.length; i++){
            matrix[i] = [i];
        }
        // increment each column in the first row
        var j;
        for(j = 0; j <= a.length; j++){
            matrix[0][j] = j;
        }
        // Fill in the rest of the matrix
        for(i = 1; i <= b.length; i++){
            for(j = 1; j <= a.length; j++){
                if(b.charAt(i-1) == a.charAt(j-1)){
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                            Math.min(matrix[i][j-1] + 1, // insertion
                                                     matrix[i-1][j] + 1)); // deletion
                }
            }
        }
        return matrix[b.length][a.length];
    };
    var posts = [
        {% for post in site.posts %}
        {% unless post.draft %}{path: "{{ post.url }}", title: "{{ post.title }}"},{% endunless %}
        {% endfor %}
    ];

    var path = window.location.pathname;
    posts.forEach(function(o) {
        var raw = getEditDistance(path, o.path);
        o.raw_dist = raw;
        o.dist = raw * o.path.length;
    })
    posts.sort(function(x,y) { return x.dist - y.dist; })
    console.log(posts);

    var list = document.getElementById('maybe-you-meant');

    for (var i = 0; i < Math.min(5, posts.length); i++) {
        var post = posts[i];
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = post.path;
        a.textContent = post.title;
        li.appendChild(a);
        list.appendChild(li);
    }
})();