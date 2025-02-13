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
    var normed = function(a, b) {
        var raw = getEditDistance(a, b);
        return 1 - raw / Math.max(a.length, b.length);
    };
    var posts = [
        
        {path: "/blog/2025/02/ci-tee/", title: "Prefer tee -a, not >>, in CI"},
        
        {path: "/blog/2024/08/async-hazard-mmap/", title: "Async hazard: mmap is secretly blocking IO"},
        
        {path: "/blog/2024/07/github-permalinks/", title: "GitHub tip-hub: habitual permalinks"},
        
        {path: "/blog/2024/03/qr-base10-base64/", title: "10 > 64, in QR codes"},
        
        {path: "/blog/2021/10/nsw-covid-qr/", title: "Mechanical sympathy for QR codes: making NSW check-in better"},
        
        {path: "/blog/2021/09/qr-error-correction/", title: "QR error correction helps and hinders scanning"},
        
        {path: "/blog/2021/08/home-cooked-app/", title: "The joy of cooking (an app)"},
        
        {path: "/blog/2020/04/worktrees-and-pyenv/", title: "Git worktrees and pyenv: developing Python libraries faster"},
        
        {path: "/blog/2016/04/myths-and-legends-about-integer-overflow-in-rust/", title: "Myths and Legends about Integer Overflow in Rust"},
        
        {path: "/blog/2016/04/memory-leaks-are-memory-safe/", title: "Memory Leaks are Memory Safe"},
        
        {path: "/blog/2015/10/rreverse-debugging/", title: "Rreverrse Debugging"},
        
        {path: "/blog/2015/10/simple_parallel-revisiting-knn/", title: "simple_parallel 0.3: Revisiting k-NN"},
        
        {path: "/blog/2015/08/simd-in-rust/", title: "SIMD in Rust"},
        
        {path: "/blog/2015/07/what-is-simd/", title: "What is SIMD?"},
        
        {path: "/blog/2015/06/travis-cargo-0.1.3/", title: "travis-cargo 0.1.3: --no-sudo"},
        
        {path: "/blog/2015/06/announcing-primal/", title: "Announcing Primal: Putting Raw Power Into Prime Numbers"},
        
        {path: "/blog/2015/05/defaulting-to-thread-safety/", title: "Defaulting to Thread-Safety: Closures and Concurrency"},
        
        {path: "/blog/2015/05/rust-1.0-in-numbers/", title: "Rust 1.0 in Numbers"},
        
        {path: "/blog/2015/05/finding-closure-in-rust/", title: "Finding Closure in Rust"},
        
        {path: "/blog/2015/05/where-self-meets-sized-revisiting-object-safety/", title: "Where Self Meets Sized: Revisiting Object Safety"},
        
        {path: "/blog/2015/05/travis-on-the-train-part-2/", title: "Travis on the train, part 2"},
        
        {path: "/blog/2015/04/helping-travis-catch-the-rustc-train/", title: "Helping Travis catch the rustc train"},
        
        {path: "/blog/2015/04/little-libraries/", title: "Little libraries"},
        
        {path: "/blog/2015/03/rust-infrastructure-can-be-your-infrastructure/", title: "Rust infrastructure can be your infrastructure"},
        
        {path: "/blog/2015/02/some-notes-on-send-and-sync/", title: "Some notes on Send and Sync"},
        
        {path: "/blog/2015/02/rust-sydney-1/", title: "Rust Sydney's first meetup: trip report"},
        
        {path: "/blog/2015/01/object-safety/", title: "Object Safety"},
        
        {path: "/blog/2015/01/the-sized-trait/", title: "The Sized Trait"},
        
        {path: "/blog/2015/01/peeking-inside-trait-objects/", title: "Peeking inside Trait Objects"},
        
        {path: "/blog/2015/01/crates.io-crate-graph/", title: "crates.io crate graph"},
        
        {path: "/blog/2014/07/what-does-rusts-unsafe-mean/", title: "What does Rust's “unsafe” mean?"},
        
        {path: "/blog/2014/06/error-handling-in-rust-knn-case-study/", title: "Error handling in Rust: a k-NN case study"},
        
        {path: "/blog/2014/06/comparing-knn-in-rust/", title: "Comparing k-NN in Rust"},
        
    ];

    var path = window.location.pathname;
    posts.forEach(function(o) {
        o.dist = normed(path, o.path) + normed(path, o.title);
    })
    posts.sort(function(x,y) { return -(x.dist - y.dist); })
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