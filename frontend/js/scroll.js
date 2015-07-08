/**
 * @file: Scroll for different purposes
 * @author: Alexander Kolobov
 */

window.Scroll = (function () {
    'use strict';

    if(!utils) {throw new Error('Scroll requires utils to be included.');}

    function Scroll(params) {

        // check params

        if(!utils.isElement(params.container)) {
            throw new Error('Scroll requires container element');
        }
        if(!utils.isElement(params.content)) {
            throw new Error('Scroll requires content element');
        }
        if(!params.container.contains(params.content)) {
            throw new Error('Scroll requires content to be inside container');
        }
        if(!utils.isElement(params.bar_outer)) {
            throw new Error('Scroll requires bar_outer element');
        }
        if(!utils.isElement(params.bar_inner)) {
            throw new Error('Scroll requires bar_inner element');
        }
        if(!params.bar_outer.contains(params.bar_inner)) {
            throw new Error('Scroll requires bar_inner to be inside bar_outer');
        }
        if(params.callback && !utils.isFunction(params.callback)) {
            throw new Error('Scroll requires callback to be a fucntion');
        }

        // apply params

        this.ui = {
            container: params.container,
            content: params.content,
            frame: utils.node('iframe', {attr: {
                frameBorder: 0,
                'class': 'scroll-content-update-frame'
            }}),
            bar: {
                outer: params.bar_outer,
                inner: params.bar_inner
            }
        };
        if(params.callback) {
            this.option_callback = params.callback;
        }

        // listen to content updates

        this.ui.content.appendChild(this.ui.frame);
        this.ui.frame.contentDocument.write('\
            <html>\
                <head><style>html,body{margin: 0;height: 100%;}</style></head>\
                <body></body>\
            </html>\
        ');
        this.ui.frame.contentDocument.close();
        if(utils.lteIE8) {
            this.ui.frame.contentWindow.document.body.onresize = this.updateBar.bind(this);
        } else {
            this.ui.frame.contentWindow.onresize = this.updateBar.bind(this);
        }

        // events
        
        utils.addEventListener(this.ui.container, 'onwheel' in window ? 'wheel' : 'mousewheel', this.wheel.bind(this));
        utils.addEventListener(this.ui.bar.outer, 'mousedown', function(event) {
            event = this.cancelEvent(event);
            if(utils.lteIE8) {
                this.lteIE8_loose_focus_flag = true;
            }
            this.scroll(
                -((event.offsetY || event.layerY)-this.ui.bar.inner.offsetHeight/2) *
                (this.ui.content.offsetHeight-this.ui.container.offsetHeight) /
                (this.ui.bar.outer.offsetHeight-this.ui.bar.inner.offsetHeight),
                true
            );
        }.bind(this));
        utils.addEventListener(this.ui.bar.inner, 'mousedown', function(event) {
            event = this.cancelEvent(event);
            if(utils.lteIE8) {
                this.lteIE8_loose_focus_flag = true;
            }
            this.interact = true;
            this.saved_content_offset_top = this.ui.content.offsetTop;
            this.saved_client_y = event.clientY;
        }.bind(this));
        utils.addEventListener(document, 'mousemove', function(event) {
            if(this.interact) {
                event = this.cancelEvent(event);
                this.scroll(
                    (this.saved_client_y - event.clientY) *
                    (this.ui.content.offsetHeight-this.ui.container.offsetHeight) /
                    (this.ui.bar.outer.offsetHeight-this.ui.bar.inner.offsetHeight) +
                    this.saved_content_offset_top,
                    true
                );
            }
        }.bind(this));
        utils.addEventListener(document, 'mouseup', function(event) {
            if(this.interact) {
                event = this.cancelEvent(event);    
                this.interact = false;
            }
            this.scroll();
        }.bind(this));

        // init

        this.updateBar();
        return {
            getLteIE8FixLooseFocusFlag: this.getLteIE8FixLooseFocusFlag.bind(this),
            setLteIE8FixLooseFocusFlag: this.setLteIE8FixLooseFocusFlag.bind(this),
            scrollTo: this.scrollTo.bind(this),
            scrolledBottom: this.scrolledBottom.bind(this),
            scrolledTop: this.scrolledTop.bind(this),
            scrollIntoView: this.scrollIntoView.bind(this)
        }
    }

    Scroll.prototype = {

        // options
        
        option_wheel_step: 30,
        option_bar_min_height: 25,
        option_callback: null,

        // private
         
        ui: null,
        saved_content_offset_top: null,
        saved_client_y: null,
        lteIE8_loose_focus_flag: false, // ugly IE8 fix for loosing focus despite of cancelBubble = true

        cancelEvent: function(event) {
            if(event && event.preventDefault) {
                event.preventDefault();
                event.stopPropagation();
                return event;
            }
            window.event.returnValue = false;
            window.event.cancelBubble = true;
            return window.event;
        },

        updateBar: function() {
            if(this.ui.content.offsetHeight) {
                if(this.ui.content.offsetHeight <= this.ui.container.offsetHeight) {
                    this.ui.bar.outer.style.display = 'none';
                } else {
                    this.ui.bar.outer.style.display = '';
                    var height = Math.max(
                        this.option_bar_min_height,
                        this.ui.bar.outer.offsetHeight*this.ui.container.offsetHeight/this.ui.content.offsetHeight);
                    this.ui.bar.inner.style.height = height+'px';
                    this.ui.bar.inner.style.top = -this.ui.content.offsetTop*
                        (this.ui.bar.outer.offsetHeight-height)/
                        (this.ui.content.offsetHeight-this.ui.container.offsetHeight)+'px';
                }
            }
            return true;
        },

        scroll: function(offset, byMouseEvent) {
            this.ui.content.style.top = Math.max(
                this.ui.container.offsetHeight-this.ui.content.offsetHeight,
                Math.min(0, offset !== void 0 ? offset : this.ui.content.offsetTop)
            ) + 'px';
            this.updateBar();
            if(this.option_callback) {
                this.option_callback(byMouseEvent);
            }
        },

        wheel: function(event) {
            event = this.cancelEvent(event);
            this.scroll(
                this.ui.content.offsetTop-this.option_wheel_step * 
                ((event.wheelDelta || -event.deltaY) > 0 ? -1 : 1)
            );
        },
        
        // public

        getLteIE8FixLooseFocusFlag: function() {
            return this.lteIE8_loose_focus_flag;
        },

        setLteIE8FixLooseFocusFlag: function(param) {
            return this.lteIE8_loose_focus_flag = !!param;
        },
        
        /**
         * Scrolls to offset
         * @param  {Number} offset
         * @return {Boolean}
         */
        scrollTo: function(offset) {
            return this.scroll(-offset);
        },

        /**
         * Returns bottom offset
         * @return {Number} or null if unavailable
         */
        scrolledBottom: function() {
            return this.ui.content.offsetHeight ?
                this.ui.content.offsetHeight + this.ui.content.offsetTop - this.ui.container.offsetHeight : 
                null;
        },

        /**
         * Returns top offset
         * @return {Number} or null if unavailable
         */
        scrolledTop: function() {
            return this.ui.content.offsetHeight ? -this.ui.content.offsetTop : null;
        },

        /**
         * Place element into viewport
         * @param  {Element} elem
         * @param  {Number} top    Provide top & height params if element is hidden or out of the DOM
         * @param  {Number} height 
         * @return {Boolean}
         */
        scrollIntoView: function(elem, top, height) {
            if(top !== void 0) {
                if(top < -this.ui.content.offsetTop) {
                    this.scroll(-top);
                } else if(top+height > -this.ui.content.offsetTop+this.ui.container.offsetHeight) {
                    this.scroll(-(top+height-this.ui.container.offsetHeight));
                }
                return true;
            } else if(elem && this.ui.content.contains(elem) && !isNaN(elem.offsetTop)) {
                if(elem.offsetTop < -this.ui.content.offsetTop) {
                    this.scroll(-elem.offsetTop);
                } else if(elem.offsetTop+elem.offsetHeight > -this.ui.content.offsetTop+this.ui.container.offsetHeight) {
                    this.scroll(-(elem.offsetTop+elem.offsetHeight-this.ui.container.offsetHeight));
                }
                return true;
            }   
            return false;
        }
    }

    return Scroll;
})();