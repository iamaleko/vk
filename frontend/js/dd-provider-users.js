/**
 * @file: Users data provider for Select
 * @author: Alexander Kolobov
 */

window.SelectProviderUsers = (function() {
    'use strict';

    if(!utils) {throw new Error('SelectProviderUsers requires utils to be included.');}

    /**
     * Create Select content provider for users content.
     * Requires params object.
     * @param {Object} data     JSON data file {uv:{},us{id:[],nf:[],nl:[],uv:[]}}
     * @param {String} url      URL to server API, optional
     * @param {Boolean} avatars Use avatars or not, optional
     */
    function SelectProviderUsers(params) {

        // check params

        if(!utils.isObject(params.data)) {
            throw new Error('SelectProviderUsers requires data to be an object');
        }

        // apply params

        if(params.avatars !== void 0) {this.option_avatars = !!params.avatars;}
        this.option_data = params.data;
        if(params.url) {this.option_url = params.url+'';}

        // init

        this.reset();
        return this.getOptions.bind(this);
    }

    SelectProviderUsers.prototype = {

        // options
        
        option_avatars: true,
        option_url: '/vktest/backend/users.php',
        option_data: null,

        // private
        
        search_index: null,
        requests: null,
        convert: {
            // Translit rules from http://www.iso.org/iso/home/store/catalogue_tc/catalogue_detail.htm?csnumber=3589
            engrus: {
                from: ['a','b','cz','ch','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r',
                    'shh','sh','s','t','u','v','w','x','yu','ya','yo','y','zh','z'],
                to: ['а','б','ц','ч','ц','д','е','ф','г','х','и','й','к','л','м','н','о','п','','р',
                    'щ','ш','с','т','у','в','в','х','ю','я','ё','ы','ж','з']
            },
            ruseng: {
                from:['а','б','в','г','д','е','ё','ж','з','и','й','к','л','м','н','о','п','р','с','т',
                    'у','ф','х','ц','ч','щ','ш','ъ','ы','ь','э','ю','я'],
                to:['a','b','v','g','d','e','yo','zh','z','i','j','k','l','m','n','o','p','r','s','t',
                    'u','f','h','cz','ch','shh','sh','','y','','e','yu','ya']
            },
            ruserr: {
                'f':'а',
                ',':'б',
                'd':'в',
                'u':'г',
                'l':'д',
                't':'е',
                '`':'ё',
                ';':'ж',
                'p':'з',
                'b':'и',
                'q':'й',
                'r':'к',
                'k':'л',
                'v':'м',
                'y':'н',
                'j':'о',
                'g':'п',
                'h':'р',
                'c':'с',
                'n':'т',
                'e':'у',
                'a':'ф',
                '[':'х',
                'w':'ц',
                'x':'ч',
                'i':'ш',
                'o':'щ',
                ']':'ъ',
                's':'ы',
                'm':'ь',
                "'":'э',
                '.':'ю',
                'z':'я'
            },
            engerr: {
                'ф':'a',
                'и':'b',
                'с':'c',
                'в':'d',
                'у':'e',
                'а':'f',
                'п':'g',
                'р':'h',
                'ш':'i',
                'о':'j',
                'л':'k',
                'д':'l',
                'ь':'m',
                'т':'n',
                'щ':'o',
                'з':'p',
                'й':'q',
                'к':'r',
                'ы':'s',
                'е':'t',
                'г':'u',
                'м':'v',
                'ц':'w',
                'ч':'x',
                'н':'y',
                'я':'z'
            }
        },

        /**
         * Drop search index and cached buffers
         * @return {Boolean}
         */
        reset: function() {
            for(var prop in this.buffers) {
                if(this.buffers[prop].local && this.buffers[prop].broad) {
                    delete this.buffers[prop];
                }
            }
            this.buffers = {};
            this.requests = [];
            this.search_index = null;
            return true;
        },

        prepareSearchIndex: function() {
            this.search_index = {};
            var i = 0;
            for(; i<this.option_data.us.id.length; i++) {
                this.search_index[this.option_data.us.id[i]] = {
                    index: i,
                    name: (this.option_data.us.nf[i]+' '+this.option_data.us.nl[i]).toLowerCase(),
                    university: this.option_data.uv[this.option_data.us.uv[i]].toLowerCase(),
                };
            }
            return true;
        },

        /**
         * Find index of current request for provided anchor
         * @param  {Object} anchor 
         * @return {Number}        The index found or -1
         */
        getRequestIndex: function(anchor) {
            var i = this.requests.length;
            while(i--) {
                if(this.requests[i].anchor === anchor) {
                    return i;
                }
            }
            return -1;
        },
        
        /**
         * Changes keyboard layout for given string according to given layout table
         * @param  {String} str    [description]
         * @param  {Object} layout Object, which keys will be replaced in string by values
         * @return {String}        
         */
        changeKeyboardLayout: function(str, layout) {
            str = str.split('');
            var i = str.length;
            while(i--) {
                if(layout[str[i]]) {
                    str[i] = layout[str[i]];
                }
            }
            return str.join('');
        },
        
        /**
         * Transliterate string in both directions
         * @param  {String}  str
         * @param  {Boolean} is_reverse
         * @return {String}             
         */
        translit: function(str, is_reverse) {
            
            // cache handlers and expressions
            
            var handler = function(convert, char) {
                    return convert.to[convert.from.indexOf(char)];
                },
                rus_eng_regexp = new RegExp(this.convert.ruseng.from.join('|'), 'g'),
                rus_eng_handler = handler.bind(null, this.convert.ruseng),
                eng_rus_regexp = new RegExp(this.convert.engrus.from.join('|'), 'g'),
                eng_rus_handler = handler.bind(null, this.convert.engrus);
            this.translit = function(str, is_reverse) {
                return is_reverse ?
                    str.replace(eng_rus_regexp, eng_rus_handler) :
                    str.replace(rus_eng_regexp, rus_eng_handler);
            };
            return this.translit(str, is_reverse);
        },
        
        /**
         * Get array of queries in appropriate order
         * @param  {String} str Initial query
         * @return {Array}      
         */
        getQueries: function(query) {
            var result = [],
                temp = null;
            
            // query itself
            
            result.push(query);
            
            // query translit
            
            temp = this.translit(query);
            if(temp === query) {
                temp = this.translit(query, true);
            }
            temp && result.push(temp);
            
            // wrong layout
            
            temp = this.changeKeyboardLayout(query, this.convert.ruserr);
            if(temp === query) {
                temp = this.changeKeyboardLayout(query, this.convert.engerr);
            }
            temp && result.push(temp);

            // wrong layout translit
            
            query = this.translit(temp);
            if(query === temp) {
                query = this.translit(temp, true);
            }
            query && result.push(query);
            return result;
        },

        sortByMatch: function(arr, type) {
            arr.sort(function(a, b) {
                return a[type][0].offset > b[type][0].offset ? 1 : 0;
            });
        },

        /**
         * Wrap substrings with span tags to highlight them
         * @param  {String} str     
         * @param  {Array} matches  [{offset: Number, limit: Number}, {...}]
         * @return {String}         
         */
        highlightStr: function(str, matches) {
            if(matches && matches.length) {
                var result = str.split(''),
                    i = matches.length,
                    args = null,
                    open_str = "<span class='dd-match'>",
                    close_str = '</span>';
                while(i--) {
                    args = [matches[i].offset, matches[i].limit];
                    switch(matches[i].limit) {
                        case 1:
                            args.push(
                                open_str+str.substr(matches[i].offset, matches[i].limit)+close_str
                            );
                        break;
                        case 2:
                            args.push(
                                open_str+str[matches[i].offset], str[matches[i].offset+1]+close_str
                            );
                        break;
                        default:
                            args.push(
                                open_str+str[matches[i].offset],
                                str.substr(matches[i].offset+1, matches[i].limit-2),
                                str[matches[i].offset+matches[i].limit-1]+close_str
                            );
                        break;
                    }
                    Array.prototype.splice.apply(result, args);
                }
                return result.join('');
            }
            return str;
        },

        /**
         * Build option element
         * @param  {Object} result Buffer result
         *                         {
         *                             id: String,
         *                             matches_name: [{offset: Number, limit: Number}, {...}],
         *                             matches_university: [{offset: Number, limit: Number}, {...}]
         *                         }
         * @return {Element}
         */
        getOptionElement: function(result, name, university) {
            var option = utils.node('div', {
                    attr: {'class': 'dd-option'}
                }),
                option_inner = utils.node('div', {
                    attr: {'class': 'dd-option-inner'}
                });
            if(this.option_avatars) {
                option_inner.appendChild(utils.node('div', {
                    attr: {'class': 'dd-option-avatar'},
                    css: {'backgroundImage': 'url("/vktest/backend/avatar.php?'+result.id+'")'}
                }));
            }
            option_inner.appendChild(utils.node('div', {
                html: this.highlightStr(
                    name,
                    result.matches_name
                ),
                attr: {'class': 'dd-option-name'}
            }));
            option_inner.appendChild(utils.node('div', {
                'html': this.highlightStr(
                    university,
                    result.matches_university
                ),
                'attr': {'class': 'dd-option-details'}
            }));
            option.appendChild(option_inner);
            return option;
        },

        /**
         * Flush data in request callback.
         * @param  {Object} buffer Buffer to flush
         * @param  {Object} anchor  Anchor of current request
         * @param  {Object} request Optional, will be detected if omitted
         * @return {Boolean}
         */
        flush: function(buffer, anchor, request) {
            
            // find request if it omitted
           
            if(!request) {
                request = this.requests[this.getRequestIndex(anchor)]; 
            }
            
            // check if it is actual request
            
            if(request.buffer !== buffer) {
                return false;
            }
            
            // collect results
            
            var i = request.flushed+request.offset,
                total = Math.min(buffer.results.length, request.offset+request.limit),
                results = [],
                data_index = null,
                name = null,
                university = null;
            for(; i<total; i++) {
                data_index = this.search_index[buffer.results[i].id].index;
                name = this.option_data.us.nf[data_index]+' '+this.option_data.us.nl[data_index];
                university = this.option_data.uv[this.option_data.us.uv[data_index]];
                results.push({
                    text: name,
                    value: buffer.results[i].id,
                    option: this.getOptionElement(buffer.results[i], name, university)
                });
            }
            request.flushed += results.length;  

            // flush results
            
            if(buffer.broad) {
                request.public_request.complete = true;
                if(!buffer.results.length) {
                    request.public_request.empty = true;
                }
                request.callback(request.public_request, results.length ? results : void 0);
            } else if(buffer.local && results.length) {
                request.callback(request.public_request, results);
            }
            return true;
        },

        // public
        
        /**
         * Seqrch and request results for specified quesry. Must recieve params object.
         * @param  {Number} limit 
         * @param  {Number} offset
         * @param  {Object} anchor     Uniq object to track request
         * @param  {Function} callback Where to flush results 
         * @return {Boolean}
         */
        getOptions: function(params) {

            // check params

            if(!utils.isObject(params.anchor)) {
                throw new Error('SelectProvider requires anchor to be an object (the same for all data requests).');
            }
            if(!utils.isFunction(params.callback)) {
                throw new Error('SelectProvider requires callback to be a fucntion.');
            }
            if(!utils.isNumber(params.offset) || params.offset<0) {
                throw new Error('SelectProvider requires offset to be a natural positive number');
            }
            if(!utils.isNumber(params.limit) || params.limit<0) {
                throw new Error('SelectProvider requires limit to be a natural positive number');
            }

            // apply params

            params.query = params.query ? (params.query+'').toLowerCase() : null;
            
            // prepare search index if it is not ready
            
            if(!this.search_index) {
                this.prepareSearchIndex();
            }

            // create new query buffer
            
            if(!this.buffers[params.query]) {
                this.buffers[params.query] = {
                    results: [],
                    results_by_id: {},
                    local: false, // local search 
                    broad: false // server search
                };
            }

            // create request (remove old request from this anchor)

            var index = this.getRequestIndex(params.anchor),
                buffer = this.buffers[params.query],
                request = {
                    anchor: params.anchor,
                    buffer: buffer,
                    offset: params.offset,
                    limit: params.limit,
                    callback: params.callback,
                    flushed: 0,
                    public_request: {
                        complete: false,
                        empty: false
                    }
                };
            ~index && this.requests.splice(index, 1);
            this.requests.push(request);

            if(params.query) {
                var queries = this.getQueries(params.query),
                    chunks = [],
                    chunk = null,
                    id = null,
                    index = null,
                    i = null,
                    query_string = null;

                // collect local results
                
                if(!buffer.local) {
                    

                    // by name

                    for(i = 0; i<queries.length; i++) {
                        chunks.push(chunk = []);    
                        for(id in this.search_index) {
                            if(~(index = this.search_index[id].name.indexOf(queries[i])) ) {
                                if(buffer.results_by_id[id]) {
                                    buffer.results_by_id[id].matches_name.push({
                                        offset: index,
                                        limit: queries[i].length
                                    });
                                } else {
                                    chunk.push(buffer.results_by_id[id] = {
                                        id: id,
                                        matches_name: [{
                                            offset: index,
                                            limit: queries[i].length
                                        }],
                                        matches_university: []
                                    });
                                }
                            } 
                        }
                        this.sortByMatch(chunk, 'matches_name');
                    }

                    // by university
                    
                    for(i = 0; i<queries.length; i++) {
                        chunks.push(chunk = []);    
                        for(id in this.search_index) {
                            if(~(index = this.search_index[id].university.indexOf(queries[i])) ) {
                                if(buffer.results_by_id[id]) {
                                    buffer.results_by_id[id].matches_university.push({
                                        offset: index,
                                        limit: queries[i].length
                                    });
                                } else {
                                    chunk.push(buffer.results_by_id[id] = {
                                        id: id,
                                        matches_university: [{
                                            offset: index,
                                            limit: queries[i].length
                                        }],
                                        matches_name: []
                                    });
                                }
                            } 
                        }
                        this.sortByMatch(chunk, 'matches_university');
                    }

                    // add to buffer

                    chunks = [].concat.apply([], chunks);
                    for(i = 0; i<chunks.length; i++) {
                        buffer.results.push(chunks[i]);
                    }
                    buffer.local = true;
                }

                // collect server results if data is not enough

                if(!buffer.results[params.offset+params.limit-1] && !buffer.broad) {
                    query_string = [];
                    i = queries.length;
                    while(i--) {
                        query_string.push('query[]='+encodeURIComponent(queries[i]));
                    }
                    utils.ajax({
                        method: 'post',
                        url: this.option_url,
                        data: query_string.join('&'),
                        success: function(buffer, anchor, result) {
                            if(result.status == 200 && result.XMLHttp.responseText) {
                                result = utils.JSONParse(result.XMLHttp.responseText.substr(8));
                                if(result && result.error=='0') {
                                    for(var i = 0; i<result.users.length; i++) {
                                        if(!buffer.results_by_id[result.users[i]]) {
                                            buffer.results.push({
                                                id: result.users[i]
                                            });
                                        }
                                    }   
                                }
                                delete buffer.results_by_id;
                                this.flush(buffer, anchor);
                            }
                        }.bind(this, buffer, params.anchor),
                        error: function(buffer, anchor) {
                            delete buffer.results_by_id;
                            this.flush(buffer, anchor);
                        }.bind(this, buffer, params.anchor)
                    });
                    buffer.broad = true;
                }
            } else {

                // return all results, server request is useless at all
                
                if(!buffer.local) {
                    for(i in this.search_index) {
                        buffer.results.push(buffer.results_by_id[i] = {
                            id: i
                        });
                    }
                    buffer.local = true;
                    buffer.broad = true;
                }    
            }

            // flush local results

            this.flush(buffer, params.anchor, request);
            return request.public_request;
        }
    };

    return SelectProviderUsers;
})();