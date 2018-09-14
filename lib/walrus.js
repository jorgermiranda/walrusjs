(function () {
}());

var Walrus = {
    $: { version: "0.2" },
    forVariablesTable: {},
    ifVariablesTable: {},
    inputVariablesTable: {},
    variablesTable: {},
    variables: [],

    initialize: function (program) {
        program(this.$);   
        for(var key in this.$ ) {
            this.variablesTable[key] = [];
            this.variables.push(key);
            watch(key, this._watcher);
        };
        this._initControllers(document.body, 0);
        this._lookForInlineVariables(document.body.innerHTML);
        return this;
    },

    _lookForInlineVariables: function(html) { 
        var rxp = /{{([^}]+)}}/g;
        var match;

        while( match = rxp.exec(html) ) {

            var key = match[1].trim();
            if(!Walrus.variablesTable[key]) {
                Walrus.variablesTable[key] = [];
                Walrus.variables.push(key);
                watch(key, Walrus._watcher);
            }
        }
    },

    _watcher: function(key, oldValue, newValue) { 
        var elements = Walrus.variablesTable[key];

        for (var i = 0, total = elements.length; i < total; i++) {
            var child = elements[i];            
            child.childNodes[0].nodeValue = Walrus.render(child, child.originalNodeValue, Walrus.$);
        }

        if(Walrus.ifVariablesTable[key]) {
            for (var j = 0, total = Walrus.ifVariablesTable[key].length; j < total; j++) {
                var el = Walrus.ifVariablesTable[key][j];                 
                el.style.display = Walrus.$[key]? null : "none";
            }
        }

        if(Walrus.forVariablesTable[key]) {
            for (var k = 0, total = Walrus.forVariablesTable[key].length; k < total; k++) {    
                var el = Walrus.forVariablesTable[key][k]; 
                var string = el.getAttribute("w-for");
                var arr = string.split("in");
                var elementKey = arr[0].replace(/\s/g, '');
                Walrus._executeFor(el, key, elementKey);  
            }
        }
    },

    _initControllers: function (el, n) {
        var self = this;
        if (el.getAttribute("w-value")) {

            if(!self.inputVariablesTable[key]) {
                self.inputVariablesTable[key] = [];
            }
            el.value = Walrus.$[el.getAttribute("w-value")];
            var changeHandler = function(event) {
                Walrus.$[el.getAttribute("w-value")] = event.target.value;
            }


            el.addEventListener("input", changeHandler, false);
            el.addEventListener("keyup", changeHandler, false);
            el.addEventListener("paste", changeHandler, false);
            el.addEventListener("mouseup", changeHandler, false);
            self.inputVariablesTable[key].push(el);
        }
        if (el.getAttribute("w-click")) {

            el.tapped = false;
            el.addEventListener("click", function(event) {                
                if (!event.target.tapped) {
                    return eval(el.getAttribute("w-click"));
                }
            }, false);
            el.addEventListener("touchstart", function(event) {
                return event.target.tapped = true;
            }, false);
            el.addEventListener("touchmove", function(event) {
                event.target.tapped = false;
                return event.stopImmediatePropagation();
            }, false);
            el.addEventListener("touchend", function(event) {
                if (event.target.tapped) {
                    return eval(el.getAttribute("w-click"));
                }
            }, false); 
        }
        if (el.getAttribute("w-include")) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    self._lookForInlineVariables(this.responseText);
                    el.innerHTML = this.responseText;
                    var children = el.children;
                    for (var j = 0, total = children.length; j < total; j++) {
                        self._initControllers(children[j], n + 1);
                    }
                    self._render(el, self.$);
                }
            };
            xhttp.open("GET", el.getAttribute("w-include"), true);
            xhttp.send();
        }
        if (el.getAttribute("w-if")) {
            var key = el.getAttribute("w-if");
            var val = self.$[key];
            if(!val) {
                el.style.display = "none";
            }
            if(!self.ifVariablesTable[key]) {
                self.ifVariablesTable[key] = [];
            }
            self.ifVariablesTable[key].push(el);
        }
        if (el.getAttribute("w-for")) {
            var string = el.getAttribute("w-for");
            var arr = string.split("in");
            var key = arr[1].replace(/\s/g, '');
            var elementKey = arr[0].replace(/\s/g, '');

            if(!self.forVariablesTable[key]) {
                self.forVariablesTable[key] = [];
            }
            
            self.forVariablesTable[key].push(el);  
            self._executeFor(el, key, elementKey);            
        }
        var children = el.children;
        for (var i = 0, total = children.length; i < total; i++) {
            self._initControllers(children[i], n + 1);
        }
        self._render(el, this.$);

    },

    _executeFor: function (el, key, elementKey) {
        el.style.display = null;

        var parent = el.parentElement;

        if(parent.forChildren) {
            for (var j = 0, total = parent.forChildren.length; j < total; j++) {            
                parent.removeChild(parent.forChildren[j]);
            }
        }

        parent.forChildren = [];

        for (var i = 0, total = Walrus.$[key].length; i < total; i++) {            
            var child = el.cloneNode(false);
            var html = el.innerHTML;
            child.innerHTML = Walrus.render2(html, Walrus.$[key][i], elementKey);  
            parent.appendChild(child);
            parent.forChildren.push(child);
        }

        el.style.display = "none";
    },

    _render: function (el, data) {
        var children = el.getElementsByTagName("*");
        for (var i = 0, total = children.length; i < total; i++) {
            var child = children[i];
            if (child.childNodes.length && child.childNodes[0].nodeValue && !child.originalNodeValue) {
                child.originalNodeValue = child.childNodes[0].nodeValue;
                child.childNodes[0].nodeValue = Walrus.render(child, child.childNodes[0].nodeValue, data);
            }
        }
    },

    render: function (el, html, data, elementKey) {

        for (var i in Walrus.variables) {
            var key = Walrus.variables[i];
            var re = "{{\\s?" + (elementKey? elementKey + "." : '') + key + "\\s?}}";
            var regExp = new RegExp(re, "gi");            
            var count = (html.match(regExp) || []).length;
            
            if(count) {
                if(this.variablesTable[key].indexOf(el) < 0) {
                    this.variablesTable[key].push(el);
                }       
                var value = (key.indexOf('.') < 0)? data[key] : byString(data, key);
                html = html.replace(new RegExp(re, "ig"), value);
            }            
        }
        return html;
    },
    render2: function (html, data, elementKey) {
        for (var key in data) {
            var re = "{{\\s?" + (elementKey? elementKey + "." : '') + key + "\\s?}}";
            var regExp = new RegExp(re, "gi");            
            var count = (html.match(regExp) || []).length;
            
            var value = (key.indexOf('.') < 0)? data[key] : byString(data, key);
            html = html.replace(new RegExp(re, "ig"), value);
        }
        return html;
    }
}


function watch(key, handler) {
    if(key.indexOf(".") < 0) {
        __watch(Walrus.$, key, handler)
    } else {
        var a = key.split('.');
        var finalKey = a.pop()
        var targetKey = a.join('.');
        var target = byString(Walrus.$, targetKey);
        if(target) {
            __watch(target, finalKey, handler, key);
        }        
    }
}

function __watch(target, prop, handler, id) {
    if (target.__lookupGetter__(prop) != null) {
        return true;
    }
    var oldval = target[prop],
        newval = oldval,
        self = this,
        getter = function () {
            return newval;
        },
        setter = function (val) {
            if (Object.prototype.toString.call(val) === '[object Array]') {
                val = _extendArray(val, handler, self, prop);
            }
            oldval = newval;
            newval = val;
            handler.call(target, id || prop, oldval, val);
        };

    if (Object.prototype.toString.call(target[prop]) === '[object Array]') {
        target[prop] = _extendArray(target[prop], handler, self, prop, id);
    }

    if (delete target[prop]) { // can't watch constants
        if (Object.defineProperty) { // ECMAScript 5
            Object.defineProperty(target, prop, {
                get: getter,
                set: setter,
                enumerable: false,
                configurable: true
            });
        } else if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) { // legacy
            Object.prototype.__defineGetter__.call(target, prop, getter);
            Object.prototype.__defineSetter__.call(target, prop, setter);
        }
    }
    return this;
};

function unwatch(target, prop) {
    var val = target[prop];
    delete target[prop]; // remove accessors
    target[prop] = val;
    return this;
};

// Allows operations performed on an array instance to trigger bindings
function _extendArray(arr, callback, framework, key, id) {
    if (arr.__wasExtended === true) return;
    var motive;
    function generateOverloadedFunction(target, methodName, self) {
        return function () {
            var oldValue = Array.prototype.concat.apply(target);
            var newValue = Array.prototype[methodName].apply(target, arguments);
            target.updated(oldValue, motive);
            return newValue;
        };
    }
    arr.updated = function (oldValue, self) {
        callback.call(this, id || key, oldValue, this, motive);
    };
    arr.concat = generateOverloadedFunction(arr, 'concat', motive);
    arr.join = generateOverloadedFunction(arr, 'join', motive);
    arr.pop = generateOverloadedFunction(arr, 'pop', motive);
    arr.push = generateOverloadedFunction(arr, 'push', motive);
    arr.reverse = generateOverloadedFunction(arr, 'reverse', motive);
    arr.shift = generateOverloadedFunction(arr, 'shift', motive);
    arr.slice = generateOverloadedFunction(arr, 'slice', motive);
    arr.sort = generateOverloadedFunction(arr, 'sort', motive);
    arr.splice = generateOverloadedFunction(arr, 'splice', motive);
    arr.unshift = generateOverloadedFunction(arr, 'unshift', motive);
    arr.__wasExtended = true;
    return arr;
}

function byString (o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
}