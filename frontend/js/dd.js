/**
 * @file: Select for different purposes
 * @author: Alexander Kolobov
 */

window.Select = (function () {
    'use strict';

    // dependencies
    
    if(!utils) {throw new Error('Select requires utils to be included.');}

    /**
     * Create Select in specified container.
     * Requires params object.
     * @param {Element}  container
     * @param {Object}   option_provider
     * @param {Boolean}  multiple
     * @param {Number}   max_selected_options        Only for multiple selects
     * @param {Number}   tab_index
     * @param {Boolean}  disabled                    Initial disable state
     * @param {Boolean}  focused                     Initial focus state
     * @param {Boolean}  focus_after_keyboard_select If true, select won't be closed after selection with 'Enter' key
     * @param {Boolean}  reset_query_after_select
     * @param {Function} callback                    Initial callback function
     */
    function Select(params) {

        // check params

        if(!utils.isElement(params.container)) {
            throw new Error('Select requires container element');
        }
        if(!utils.isFunction(params.provider)) {
            throw new Error('Select requires provider to be a function');
        }
        if(params.max_selected_options !== void 0 && !utils.isNumber(params.max_selected_options)) {
            throw new Error('Select requires max_selected_options to be a finite number');
        }
        if(params.tab_index !== void 0 && !utils.isNumber(params.tab_index)) {
            throw new Error('Select requires tab_index to be a finite number');
        }
        if(params.callback !== void 0 && !utils.isFunction(params.callback)) {
            throw new Error('Select requires callback to be a fucntion');
        }

        // apply params

        this.option_callbacks = [];
        if(params.callback) {
            this.option_callbacks.push(params.callback);
        }
        this.option_provider = params.provider;
        if(params.max_selected_options !== void 0 && params.max_selected_options > -1) {
            this.option_max_selected_options = params.max_selected_options*1;
        }
        if(params.tab_index !== void 0) {
            this.option_tab_index = params.tab_index*1;
        }
        if(params.multiple !== void 0) {
            this.option_multiple = !!params.multiple;
        }
        if(params.disabled !== void 0) {
            this.option_disabled = !!params.disabled;
        }
        if(params.focused !== void 0) {
            this.option_focused = !!params.focused;
        }
        if(params.focus_after_keyboard_select !== void 0) {
            this.option_focus_after_keyboard_select = !!params.focus_after_keyboard_select;
        }
        if(params.reset_query_after_select !== void 0) {
            this.option_reset_query_after_select = !!params.reset_query_after_select;
        }

        // create ui
        
        var frag = utils.node('fragment');
        this.ui = {
            container_outer: params.container,
            container_inner: utils.node('div', {attr: {'class':'dd-inner'}}),
            arrow: utils.node('div', {attr: {'class': 'dd-arrow'}}),
            clear: utils.node('div', {attr: {'class': 'dd-clear dd-clear-hidden'}}),
            add: utils.node('div', {
                html: "<div class='dd-item-add-name'>"+this.i18n.add+"</div><div class='dd-item-add-cross'></div>",
                attr: {'class':'dd-item-add dd-item-add-hidden'}
            }),
            anchor: utils.node('div', {attr: {'class': 'dd-anchor'}}),
            input: utils.node('input', {
                attr: {
                    'class': this.option_multiple ? 'dd-input' : 'dd-input-single',
                    placeholder: this.i18n.placeholder,
                    autocomplete: 'off',
                    type: 'text'
                },
                css: {display: 'none'}
            }),
            options_outer: utils.node('div', {attr: {'class': 'dd-options-outer dd-options-outer-hidden'}}),
            options_inner: utils.node('div', {attr: {'class': 'dd-options-inner'}}),
            scroll_container: utils.node('div', {attr: {'class': 'scroll-container'}}),
            scroll_content: utils.node('div', {attr: {'class': 'scroll-content'}}),
            scroll_bar_outer: utils.node('div', {attr: {'class': 'scroll-bar-outer'}}),
            scroll_bar_inner: utils.node('div', {
                html: '<div></div>',
                attr: {'class': 'scroll-bar-inner'}
            }),
            message: utils.node('div', {
                text: this.i18n.empty,
                attr: {'class': 'dd-message dd-message-hidden'}
            }),
            options_listed_container: utils.node('div'),
            options_selected_container: utils.node('div')
        };
        this.ui.input.setAttribute('tabindex', this.option_tab_index);
        this.ui.container_inner.appendChild(this.ui.arrow);
        this.ui.container_inner.appendChild(this.ui.clear);
        this.ui.container_inner.appendChild(this.ui.options_selected_container);
        this.ui.container_inner.appendChild(this.ui.anchor);
        this.ui.container_inner.appendChild(this.ui.add);
        this.ui.container_inner.appendChild(this.ui.input);
        this.ui.container_inner.appendChild(utils.node('br', {attr: {'class':'clear'}}));
        this.ui.scroll_container.appendChild(this.ui.scroll_bar_outer);
        this.ui.scroll_container.appendChild(this.ui.scroll_content);
        this.ui.scroll_bar_outer.appendChild(this.ui.scroll_bar_inner);
        this.ui.scroll_content.appendChild(this.ui.message);
        this.ui.scroll_content.appendChild(this.ui.options_listed_container);
        this.ui.options_inner.appendChild(this.ui.scroll_container);
        this.ui.options_outer.appendChild(this.ui.options_inner);
        this.ui.options_outer.appendChild(utils.node('div', {attr: {'class':'dd-options-shadow-1'}}));
        this.ui.options_outer.appendChild(utils.node('div', {attr: {'class':'dd-options-shadow-2'}}));
        utils.classes.add(this.ui.container_outer, 'dd');
        frag.appendChild(this.ui.container_inner);
        this.ui.container_outer.appendChild(frag);
        this.ui.container_outer.appendChild(this.ui.options_outer);
        this.scroll = new Scroll({
            container: this.ui.scroll_container,
            content: this.ui.scroll_content,
            bar_inner: this.ui.scroll_bar_inner,
            bar_outer: this.ui.scroll_bar_outer,
            callback: this.checkListedOptions.bind(this)
        });

        // events
        
        utils.addEventListener(this.ui.input, 'focus', function() {
            this.focus_timeout && clearTimeout(this.focus_timeout);
            this.focus_timeout = setTimeout(function(){
                this.query = this.ui.input.value;
                this.is_focused = true;
                this.setCursorToEnd();
                this.update();
            }.bind(this), 1); // Browsers autofill fix
        }.bind(this));
        utils.addEventListener(this.ui.input, 'blur', function() {
            if(this.scroll.getLteIE8FixLooseFocusFlag()) {
                this.setFocus(true);
                this.scroll.setLteIE8FixLooseFocusFlag(false); // IE8 Fix
                return false;
            }
            this.is_focused = false;
            this.update();
        }.bind(this));
        utils.addEventListener(this.ui.options_outer, 'mousemove', function() { // false positive option mouseover fix
            this.prevent_false_positive = false;
            if(this.prevented_index !== null) {
                this.highlightOption(this.prevented_index, false);
                this.prevented_index = null;
            }
        }.bind(this));
        utils.addEventListener(this.ui.arrow, 'mousedown', function() {
            if(
                this.is_focused ||
                this.option_max_selected_options &&
                this.selected_options_length >= this.option_max_selected_options
            ) {
                return;
            }
            setTimeout(this.setFocus.bind(this, true), 1);
        }.bind(this));
        utils.addEventListener(this.ui.clear, 'mousedown', function() {
            this.deselectAll();
            this.update();
        }.bind(this));
        utils.addEventListener(this.ui.container_inner, 'mousedown', function(event) {
            if(
                this.is_focused ||
                this.option_max_selected_options &&
                this.selected_options_length >= this.option_max_selected_options
            ) {
                return;
            }
            var target = event && event.target ? event.target : window.event.srcElement,
                item = null;
            if(!this.option_multiple) {
                for(item in this.selected_options) {
                    item = this.selected_options[item].item;
                    break;
                }
            }
            if(
                target && (
                    target === this.ui.container_inner ||
                    target === this.ui.add ||
                    this.ui.add.contains(target) ||
                    item && (
                        target === item ||
                        item.contains(target)
                    )
                )
            ) {
                setTimeout(this.setFocus.bind(this, true), 1);
            }
        }.bind(this));
        var handler = function(changeOption, event) {
                if(
                    this.option_max_selected_options &&
                    this.selected_options_length >= this.option_max_selected_options ||
                    changeOption &&
                    this.changeOption(event)
                ) {
                    return;
                }
                this.input_timeout && clearTimeout(this.input_timeout);
                this.input_timeout = setTimeout(function() {
                    this.query = this.ui.input.value;
                    this.update();
                }.bind(this), this.option_input_timeout);
            };
        utils.addEventListener(this.ui.input, 'keydown', handler.bind(this, true));
        handler = handler.bind(this, false);
        utils.addEventListener(this.ui.input, 'paste', handler);
        utils.addEventListener(this.ui.input, 'textInput', handler);
        utils.addEventListener(this.ui.input, 'input', handler);

        // init
        
        this.reset();
        setTimeout(function() { // prevent auto-obtaining focus
            this.ui.input.style.display = '';
            this.setFocus(this.focused);
            this.update();
        }.bind(this), 1);

        // api
        
        return {
            getSelectedOptions: this.getSelectedOptions.bind(this),
            addCallback: this.addCallback.bind(this),
            removeCallback: this.removeCallback.bind(this),
            setDisabled: this.setDisabled.bind(this),
            setQuery: this.setQuery.bind(this),
            setFocus: this.setFocus.bind(this),
            reset: this.reset.bind(this)
        };
    }

    Select.prototype = {

        // options
        
        option_provider: null,
        option_callbacks: null,
        option_max_selected_options: 0,
        option_tab_index: 0,
        option_multiple: true,
        option_disabled: false,
        option_focused: false,
        option_focus_after_keyboard_select: false,
        option_reset_query_after_select: true,
        option_input_timeout: 100,
        option_limit: 30,
        option_min_input_width: 158,
        option_max_options_in_chunk: 150,
        option_chunk_preload_offset: 500,
        i18n: {
            add: 'Добавить',
            empty: 'Пользователь не найден',
            placeholder: 'Введите имя друга или email'
        },

        // private
        
        offset: 0,
        x: null,
        y: null,
        input_timeout: null,
        ui: null,
        selected_options: null,
        selected_options_length: null,
        listed_options: null,
        highlighted_option_index: null,
        data_request: null,
        prevent_false_positive: null,
        prevented_index: null,
        drop_listed_options: null,
        last_is_focused: null,
        last_query: null,
        last_selected_options_length: null,
        last_highlighted_option_top: null,
        listed_chunks: null,
        scroll: null,
        query: '',
        is_disabled: false,
        is_focused: false,
        
        getSelectedOptions: function() {
            var result = [],
                value = null;
            for(value in this.selected_options) {
                result.push({value:value, text:this.selected_options[value].text}); 
            }
            return result;
        },

        runCallbacks: function() {
            var options = this.getSelectedOptions(),
                i = 0;
            for(; i<this.option_callbacks.length; i++) {
                this.option_callbacks[i](options);
            }
            return true;
        },

        deselectAll: function() {
            this.last_selected_options_length = null;
            this.ui.options_selected_container.innerHTML = '';
            this.selected_options = {};
            this.selected_options_length = 0;
            this.runCallbacks();
            return true;
        },

        selectOption: function(option) {
            if(
                this.option_max_selected_options === 0 ||
                this.selected_options_length < this.option_max_selected_options &&
                !this.selected_options[option.value]
            ) {
                if(this.option_multiple) {
                    this.selected_options[option.value] = option;
                    ++this.selected_options_length;
                } else {
                    this.deselectAll();
                    this.selected_options[option.value] = option;
                    this.selected_options_length = 1;
                }
                if(this.option_reset_query_after_select) {
                    this.ui.input.value = '';
                    this.query = '';
                }
                if(!this.option_focus_after_keyboard_select) {
                    this.setFocus(false);
                }
                this.update();
                this.runCallbacks();
                return true;
            }
            return false;
        },

        deselectOption: function(option) {
            this.ui.options_selected_container.removeChild(this.selected_options[option.value].item);
            delete this.selected_options[option.value];
            --this.selected_options_length;
            this.update();
            this.runCallbacks();
            return true;
        },

        highlightOption: function(index, preventFalsePositive) {
            if(preventFalsePositive) {
                this.prevent_false_positive = true;
            } else if(this.prevent_false_positive) {
                this.prevented_index = index;
                return;
            }
            if(this.listed_options[index]) {
                if(this.highlighted_option_index !== null && this.listed_options[this.highlighted_option_index]) {
                    utils.classes.remove(this.listed_options[this.highlighted_option_index].option, 'dd-highlighted');
                }
                utils.classes.add(this.listed_options[index].option, 'dd-highlighted');
                this.highlighted_option_index = index;
                this.highlighted_option_top = this.listed_options[index].option.offsetTop;
                this.highlighted_option_height = this.listed_options[index].option.offsetHeight;
                return true;
            }
            return false;
        },

        changeOption: function(event) {
            if(!event) {
                event = window.event;
            }
            if(this.is_focused) {
                switch(event.key || event.keyCode) {
                    case 'Escape':case 'Esc':case 27:
                        if(event && event.preventDefault) {
                            event.preventDefault();
                            event.stopPropagation();
                        } else {
                            window.event.returnValue = false;
                            window.event.cancelBubble = true;
                        }
                        if(this.query === '') {
                            this.setFocus(false);
                        } else {
                            this.ui.input.value = '';
                            this.query = '';
                            this.update();
                        }                        
                        return true;
                    break;
                    case 'ArrowDown':case 'Down':case 40:
                        if(
                            this.highlighted_option_index !== null &&
                            this.highlightOption(this.highlighted_option_index+1, true)
                        ) {
                            this.scroll.scrollIntoView(
                                this.listed_options[this.highlighted_option_index].option,
                                this.highlighted_option_top,
                                this.highlighted_option_height
                            );
                            return true;
                        }
                    break;
                    case 'ArrowUp':case 'Up':case 38:
                        if(
                            this.highlighted_option_index !== null &&
                            this.highlightOption(this.highlighted_option_index-1, true)
                        ) {
                            this.scroll.scrollIntoView(
                                this.listed_options[this.highlighted_option_index].option,
                                this.highlighted_option_top,
                                this.highlighted_option_height
                            );
                            return true;
                        }
                    break;
                    case 'Enter':case 13:
                        if(
                            this.highlighted_option_index !== null &&
                            this.is_focused &&
                            this.listed_options[this.highlighted_option_index]
                        ) {
                            this.selectOption(this.listed_options[this.highlighted_option_index]);
                            return true;
                        }
                    break;
                }
            }
            return false;
        },

        dropListedOptions: function() {
            this.ui.options_listed_container.innerHTML = '';
            this.listed_options = [];
            this.listed_chunks = [];
            this.highlighted_option_index = null;
            this.highlighted_option_top = null;
            this.highlighted_option_height = null;
            this.scroll.scrollTo(0);
            this.prevent_false_positive = null;
            this.drop_listed_options = false;
            this.prevented_index = null;
            return true;
        },

        addListedOptions: function(request, options) {

            // drop listed options

            if(this.drop_listed_options) {
                this.dropListedOptions();
            }

            // list new options
            // contain options in chunks

            if(options) {
                var i = 0,
                    chunk = null,
                    last_chunk = null,
                    frag = utils.node('fragment');
                for(; i<options.length; i++)    {
                    ++this.offset;
                    if(this.selected_options[options[i].value]) {
                        continue;
                    }
                    last_chunk = this.listed_chunks[this.listed_chunks.length-1];
                    if(last_chunk && last_chunk.length < this.option_max_options_in_chunk) {
                        chunk = last_chunk;
                    } else {
                        if(chunk) {
                            chunk.container.appendChild(frag);
                        }
                        frag = utils.node('fragment');
                        this.listed_chunks.push(chunk = {
                            visible: true,
                            length: 0,
                            container: utils.node('div', {attr:{'class':'dd-chunk'}}),
                            dummy: utils.node('div')
                        });
                        this.ui.options_listed_container.appendChild(chunk.container);
                    }
                    chunk.length++;
                    this.listed_options.push(options[i]);
                    utils.addEventListener(options[i].option, 'mousedown',
                        this.selectOption.bind(this, options[i]));
                    utils.addEventListener(options[i].option, 'mouseover',
                        this.highlightOption.bind(this, this.listed_options.length-1, false));
                    frag.appendChild(options[i].option);
                }
                if(chunk) {
                    chunk.container.appendChild(frag);
                }
                if(this.highlighted_option_index === null) {
                    if(this.highlightOption(0)) {
                        utils.classes.add(this.ui.message, 'dd-message-hidden');
                        this.checkListedOptions();
                    }
                }
            }

            // check if list is not empty

            if(request.empty || request.complete && !this.listed_options.length) {  
                utils.classes.remove(this.ui.message, 'dd-message-hidden');
            }
            return true;
        },

        setCursorToEnd: function () {
            var pos = this.ui.input.value.length;
            if(this.ui.input.createTextRange) {
                var range = this.ui.input.createTextRange();
                range.move('character', pos);
                range.select();
            } else if (this.ui.input.selectionStart || this.ui.input.selectionStart === 0) {
                this.ui.input.setSelectionRange(pos, pos);
            }
            return true;
        },

        checkListedOptions: function(byMouseEvent) {
            if(this.is_focused) {
                var bottom = this.scroll.scrolledBottom(),
                    top = this.scroll.scrolledTop();

                // request additional data

                if(
                    bottom !== null &&
                    !byMouseEvent &&
                    this.data_request &&
                    this.data_request.complete &&
                    !this.data_request.empty &&
                    this.listed_options.length &&
                    bottom < this.option_chunk_preload_offset
                ) {
                    this.data_request = this.option_provider({
                        'anchor': this,
                        'query': this.query,
                        'offset': this.offset,
                        'limit': this.option_limit,
                        'callback': this.addListedOptions.bind(this)
                    });
                }

                // hide and show chunks

                if(top !== null) {
                    var i = this.listed_chunks.length,
                        chunk = null;
                    while(i--) {
                        chunk = this.listed_chunks[i];
                        if(chunk.complete || chunk.length === this.option_max_options_in_chunk) {
                            if(!chunk.complete) {
                                chunk.top = chunk.container.offsetTop;
                                chunk.bottom = chunk.container.offsetHeight+chunk.top;
                                chunk.dummy.style.height = chunk.container.offsetHeight+'px';
                                chunk.complete = true;
                            }
                            if(
                                chunk.bottom < top-this.option_chunk_preload_offset ||
                                chunk.top > top+this.ui.options_outer.offsetHeight+this.option_chunk_preload_offset
                            ) {
                                if(chunk.visible) {
                                    chunk.visible = false;
                                    this.ui.options_listed_container.insertBefore(chunk.dummy, chunk.container);
                                    this.ui.options_listed_container.removeChild(chunk.container);
                                }
                            } else {
                                if(!chunk.visible) {
                                    chunk.visible = true;
                                    this.ui.options_listed_container.insertBefore(chunk.container, chunk.dummy);
                                    this.ui.options_listed_container.removeChild(chunk.dummy);
                                }
                            }
                        }
                    }
                }
            }
        },

        update: function() {

            // update selected

            if(this.last_selected_options_length < this.selected_options_length) {
                var cross = null,
                    value = null,
                    frag = utils.node('fragment');
                for(value in this.selected_options) {
                    if(!this.selected_options[value].item) {
                        this.selected_options[value].item = utils.node('div', {
                            html: "<div class='dd-item-name'>"+this.selected_options[value].text+"</div>",
                            attr: {'class': this.option_multiple ? 'dd-item' : 'dd-item-single'}
                        });
                        if(this.option_multiple) {
                            cross = utils.node('div', {attr: {'class': 'dd-item-cross'}});
                            utils.addEventListener(cross, 'mouseup',
                                this.deselectOption.bind(this, this.selected_options[value]));
                            this.selected_options[value].item.appendChild(cross);
                        }
                        frag.appendChild(this.selected_options[value].item);
                    }
                }
                this.ui.options_selected_container.appendChild(frag);
            }

            // update input position and size, deal with add-item 
            
            if(this.option_multiple) {
                if(
                    this.option_max_selected_options &&
                    this.selected_options_length >= this.option_max_selected_options
                ) {
                    if(!utils.classes.has(this.ui.arrow, 'dd-arrow-hidden')) {
                        utils.classes.add(this.ui.input, 'dd-input-hidden');
                        utils.classes.add(this.ui.add, 'dd-item-add-hidden');
                        utils.classes.add(this.ui.arrow, 'dd-arrow-hidden');
                        utils.classes.remove(this.ui.clear, 'dd-clear-hidden');
                    }
                } else {
                    if(utils.classes.has(this.ui.arrow, 'dd-arrow-hidden')) {
                        utils.classes.remove(this.ui.arrow, 'dd-arrow-hidden');
                        utils.classes.add(this.ui.clear, 'dd-clear-hidden');
                    }
                    if(this.is_focused || !this.selected_options_length) {
                        utils.classes.remove(this.ui.input, 'dd-input-hidden');
                        utils.classes.add(this.ui.add, 'dd-item-add-hidden');
                    } else if(this.query === '' && this.selected_options_length){
                        utils.classes.add(this.ui.input, 'dd-input-hidden');
                        utils.classes.remove(this.ui.add, 'dd-item-add-hidden');
                    }
                    
                }
            } else {
                if(!this.is_focused && this.selected_options_length) {
                    utils.classes.remove(this.ui.clear, 'dd-clear-hidden');
                    utils.classes.add(this.ui.input, 'dd-input-hidden');
                    this.ui.options_selected_container.style.display = '';
                } else {
                    utils.classes.remove(this.ui.input, 'dd-input-hidden');
                    utils.classes.add(this.ui.clear, 'dd-clear-hidden');
                    this.ui.options_selected_container.style.display = 'none';
                }
            }
            if(this.last_selected_options_length !== this.selected_options_length) {
                var width = ((this.ui.arrow.offsetLeft + (this.ui.anchor.offsetTop < this.ui.anchor.offsetHeight ?
                    0 : this.ui.arrow.scrollWidth) - this.ui.anchor.offsetLeft)) - 2; // IE10 fix
                this.ui.input.style.width = (width < this.option_min_input_width ? '100%' : width+'px');
            }   
            
            // update list data
            
            if(
                this.is_focused && this.last_query !== this.query ||
                this.last_selected_options_length != this.selected_options_length
            ) {
                
                this.drop_listed_options = true;
                this.offset = 0;
                this.data_request = this.option_provider({
                    'anchor': this,
                    'query': this.query,
                    'offset': this.offset,
                    'limit': this.option_limit,
                    'callback': this.addListedOptions.bind(this)
                });
                this.last_query = this.query;
            }

            // update list visibility
            
            if(
                this.option_max_selected_options &&
                this.selected_options_length >= this.option_max_selected_options
            ) {
                utils.classes.add(this.ui.options_outer, 'dd-options-outer-hidden');
            } else {
                if(this.last_is_focused !== this.is_focused) {
                    utils.classes[this.is_focused ? 'remove' : 'add'](this.ui.options_outer, 'dd-options-outer-hidden');
                }
            }
            
            this.last_is_focused = this.is_focused;
            this.last_selected_options_length = this.selected_options_length;
        },

        // public

        addCallback: function(callback) {
            if(callback && utils.isFunction(callback)) {
                this.option_callbacks.push(callback);
                return true;
            }
            return false;
        },

        removeCallback: function(callback) {
            var index = this.option_callbacks.indexOf(callback);
            if(~index) {
                this.option_callbacks.splice(index, 1);
                return true;
            }
            return false;
        },

        setDisabled: function(param) {
            if(this.is_disabled != param) {  
                this.is_disabled = !!param;
                if(this.is_disabled) {
                    utils.classes.add(this.ui.container_outer, 'dd-disabled');
                    this.ui.input.disabled = true;
                } else {
                    utils.classes.remove(this.ui.container_outer, 'dd-disabled');
                    this.ui.input.disabled = false;
                }
                return true;
            }
            return false;
        },

        setQuery: function(query) {
            query = query ? query+'' : '';
            if(this.query !== query) {
                this.query = query;
                this.update();
                return true;
            }
            return false;
        },

        setFocus: function(param) {
            this.ui.input[(this.is_focused = !!param) ? 'focus' : 'blur']();
            return true;
        },

        reset: function() {
            this.setDisabled(this.option_disabled);
            this.deselectAll();
            this.dropListedOptions();
            this.query = this.ui.input.value;
            this.drop_listed_options = false;
            this.offset = 0;
            this.data_request = null;
            this.setFocus(this.option_focused);
            return true;
        }
    };

    return Select;
})();