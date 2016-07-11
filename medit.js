/*!
 * MEdit v0.1.0
 * http://wayf.dk/
 *
 * Dependencies: lodash.
 *
 * Released under the MIT license.
 */

window.medit = function(xmlData, table, template, resolver, bindings, pairings, mappings, prefixes, xmlDisplay) {
    var xmlMetadata;
    var focus;

    if (_.isString(xmlData)) {
      if (xmlData[0] === '#' || xmlData[0] === '.') {
          xmlMetadata = document.querySelector(xmlData).textContent;
      } else {
        xmlMetadata = xmlData;
      }
    } else if (_.isElement(xmlData)) {
        xmlMetadata = xmlData.textContent;
    } else {
        throw new Error('I have no XML to work with! Giving up...');
    }

    var xmlpp = (function() {

/**
* Version - 0.99.00.beta
* Copyright (c) 2012 Vadim Kiryukhin
* vkiryukhin @ gmail.com
* http://www.eslinstructor.net/vkbeautify/
*/
function vkbeautify(){
	this.step = '\t'; // 4 spaces
};

vkbeautify.prototype.xml = function(text,step) {

	var ar = text.replace(/>\s{0,}</g,"><")
				 .replace(/</g,"~::~<")
				 .replace(/\s*xmlns\:/g,"~::~xmlns:")
				 .replace(/\s*xmlns\=/g,"~::~xmlns=")
				 .split('~::~'),
		len = ar.length,
		inComment = false,
		deep = 0,
		str = '',
		ix = 0;

    console.log('ar', ar);

		for(ix=0;ix<len;ix++) {
			// start comment or <![CDATA[...]]> or <!DOCTYPE //
			if(ar[ix].search(/<!/) > -1) {
				str += step+ar[ix];
				inComment = true;
				// end comment  or <![CDATA[...]]> //
				if(ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1 || ar[ix].search(/!DOCTYPE/) > -1 ) {
					inComment = false;
				}
			} else
			// end comment  or <![CDATA[...]]> //
			if(ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) {
				str += ar[ix];
				inComment = false;
			} else
			// <elm></elm> //
			if( /^<\w/.exec(ar[ix-1]) && /^<\/\w/.exec(ar[ix]) &&
				/^<[\w:\-\.\,]+/.exec(ar[ix-1]) == /^<\/[\w:\-\.\,]+/.exec(ar[ix])[0].replace('/','')) {
				str += ar[ix];
				if(!inComment) deep--;
			} else
			 // <elm> //
			if(ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) == -1 && ar[ix].search(/\/>/) == -1 ) {
				str = !inComment ? str += "\n" +_.repeat(step, deep++)+ar[ix] : str += ar[ix];
			} else
			 // <elm>...</elm> //
			if(ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) {
				str = !inComment ? str += "\n" +_.repeat(step, deep)+ar[ix] : str += ar[ix];
			} else
			// </elm> //
			if(ar[ix].search(/<\//) > -1) {
				str = !inComment ? str += "\n" +_.repeat(step, --deep)+ar[ix] : str += ar[ix];
			} else
			// <elm/> //
			if(ar[ix].search(/\/>/) > -1 ) {
				str = !inComment ? str += "\n" +_.repeat(step, deep)+ar[ix] : str += ar[ix];
			} else
			// <? xml ... ?> //
			if(ar[ix].search(/<\?/) > -1) {
				str += "\n" +_.repeat(step, deep)+ar[ix];
			} else
			// xmlns //
  			if( ar[ix].search(/xmlns\:/) > -1  || ar[ix].search(/xmlns\=/) > -1) {
  				str += ' '+ar[ix];
  			}

			else {
				str += ar[ix];
			}
		}

	return  (str[0] == '\n') ? str.slice(1) : str;
}

    var vk = new vkbeautify;
    return vk.xml;
    })()

    function flatten(xp, context, defaultxpath, prefixes, mappings) {

        var flat = {};

        for (var i = 0; i < mappings.length; i++) {
            var k = mappings[i].key;
            var q = mappings[i].path;
            var roles = mappings[i].roles;
            if (!q) {
                q = defaultxpath + k;
                q = q.replace(/:#$/, '[#]');
                roles = ['wayf'];
            }

            if (!roles.length) roles = ['c'];
            for (var j = 0; j < prefixes.length; j++) {
                var fprefix = prefixes[j].prefix;
                var xprefix = prefixes[j].path;

                if (_.indexOf(roles, fprefix.toLowerCase()) == -1) continue;
                var slash = xprefix ? '/' : '';
                handleRepeating(k, k, xprefix + slash + q, fprefix + '/', xp, context, flat);
            }
        }
        return flat;
    };

    function handleRepeating (superk, k, q, prefix, xp, context, flat) {
        var x = 1, repeat = 1;

        var multi = k.indexOf('#') !== -1;
        if (multi) {
            var repeatingelement = q.split('[#', 1)[0];
            repeat = xp.query(repeatingelement, context).snapshotLength;
            if (!repeat) {
                return;
            }
        }

        do {
            var kk = k.replace('#', x - 1);
            var qq = q.replace('#', x);
            if (kk.indexOf('#') !== -1) {
                handleRepeating(superk, kk, qq, prefix, xp, context, flat);
            } else {
                var node = xp.query(qq, context);
                if (node.snapshotLength === 0 && /@xml:lang$/.test(qq)) {
                    node = xp.query(qq.replace(/@xml:lang$/, '@xs:lang'), context);
                }

                if (node.snapshotLength > 0) {
                    flat[prefix + superk] = flat[prefix + superk] || {};
                    flat[prefix + superk][prefix + kk] = node.snapshotItem(0).textContent;
                }
            }
            x++;
            repeat--;
        } while (multi && repeat > 0);
    }

    function flat2hierarchial(flat) {
        var obj = {};

        // This is like Object.entries but that requires a polyfill
        // because it is only part of ES7
        _.entries(flat).forEach(function(a) {
            _.entries(a[1]).forEach(function(b) {
                var elems = b[0].split(/[\/:]/);
                // add a '_' key for bare values
                if (elems[elems.length -1].match(/^\d+$/)) elems.push('_');

                // This automatically set a deep value in an object
                // It also handles numbers that will instead just be an array
                // _.set({}, ['a', 'b'], 'c') -> { a: { b: 'c' } }
                var nobj = _.set({}, elems, b[1]);

                // This will take care of merging the values
                // _.merge({ C: { a: 'a' } }, { C: { b: 'b' } }) -> { C: { a: 'a', b: 'b' } }
                obj = _.merge(obj, nobj);
            });
        });

        return obj;
    };

    function tabulize (data, level, path, dlevel) {
        var rowspan = 0;
        var duplication = false;
        var ret = [];
        var tr, rows;
        level++;
        duplication = _.isArray(data);
        dlevel = duplication ? dlevel + 1 : dlevel;

        // Object.keys(data).sort(function (a, b) { return a.localeCompare(b);}).forEach(function(k) {
        Object.keys(data).forEach(function(k) {
            var v = data[k];
            var dup = 0;
            var currentpath = path+':'+k;
            var defpath = currentpath.replace('/\d+/g', '0');

            if (_.isObject(v)) {
                var _tabulize = tabulize(v, level, currentpath, dlevel);

                tr = _tabulize[0];
                rows = _tabulize[1];
                dup = _tabulize[2];
            } else {
                tr = [[{level: level, dlevel: dlevel, path: currentpath, val: v}]];
                rows = 1;
            }
            tr[0].unshift({level: level, dlevel: dlevel, dup: dup, del: duplication, rows: rows, val: k, key: defpath});
            ret = _.concat(ret, tr);
            rowspan += rows;
        });
        return [ret, rowspan, duplication];
    };

    // hierachize ie. convert a flat data array to a DOM context
    function hierarchize(data, xp, context, defaultxpath, prefixes, xmap) {
        _.each(xmap, function(query) {
            var superkey = query.key;
            query = query.path;
            if (!query) {
                query = defaultxpath + superkey;
                query = query.replace(/:#$/, '[#]');
            }
            query = '/' + query;

            _.each(prefixes, function(prefix) {
                var xprefix = prefix.path;
                xprefix = (xprefix ? '/' : '') + xprefix;
                var fprefix = prefix.prefix + '/';

                if (!data[fprefix + superkey]) { return; }

                _.each(data[fprefix + superkey], function(val, key) {
                    d = key.match(/^(?:(.*)\/)?(.+)$/);
                    var _d = d;
                    var dummy = _d[0];
                    var keyrole = _d[1];
                    var key = _d[2];

                    q = xprefix + query;

                    f2xhandlerepeatingvalues(key, q, val, xp, context, 0);
                });
            });
        });
        return context;
    };

    // Helper for hierarchizing multiple entities from flat to xmlDoc
    function f2xhandlerepeatingvalues(key, q, val, xp, context, keyoffset) {
        if (q.indexOf('#') >= 0) {
            var re = /(\d+)/g;
            re.lastIndex = keyoffset;
            var d = re.exec(key);

            var thisindex = parseInt(d[1]) + 1;
            keyoffset = re.lastIndex;
            var index = 1;
            while( index < thisindex) {
                qq = q.replace(/#/, index);
                f2xhandlerepeatingvalues(key, qq, null, xp, context, keyoffset);
                index++;
            }
            q = q.replace(/#/, thisindex);
            f2xhandlerepeatingvalues(key, q, val, xp, context, keyoffset);
            return;
        }
        query(xp, context, q, val, false);
    };

    function hierarchialWithDefaults(defaults, data, prev) {

        _.each(defaults, function(v, k) {

            if (_.isObject(v)) {

                var acc = prev === [] ? [k] : prev.concat(k);
                var data_value = _.get(data, acc);
                if (_.isArray(v)) {

                    if (_.isArray(data_value)) {
                        data_value.forEach(function(v2, i) {
                            _.set(data, acc.concat(i), _.defaults(v2, v[0]));
                        });
                    }

                } else {
                    _.set(data, acc, _.defaults(data_value, v));
                }

                hierarchialWithDefaults(v, data, acc);
            }

        });
    };

    function query (xp, context, query, rec, before) {
        // query always starts with / ie. is always 'absolute' in relation to the context
        // split in path elements, an element might include an attribute expression incl. value eg.
        // /md:EntitiesDescriptor/md:EntityDescriptor[@entityID="https://wayf.wayf.dk"]/md:SPSSODescriptor
        var path = query.match(/\/([^/"]*("[^"]*")?[^/"]*)/g);
        var newcontext;

        for (var i = 0; i < path.length; i++) {
            var element = path[i].substr(1);
            var nodes = xp.query(element, context);
            if (nodes.snapshotLength) {
                newcontext= context = nodes.snapshotItem(0);
                continue;
            } else {
                var d = element.match(new RegExp(
                    /^(?:(\w+):?)?/.source +                    // optional localnamespace
                    /([^\[@]*)/.source +                        // element not containing [ or @
                    /(?:\[(\d+)\])?/.source +                   // optional position
                    /(?:\[?@([^=]+)(?:="([^"]*)"])?)?/.source + // attributename prefixed by optional [ - for expression
                                                                // optional attribute value
                    /()/.source));                              // only to make sure the optional attribute values is set in d!

                if (d == null) { console.error('query not ok:', query, element); throw new Error('Whoops!'); }
                var _d = d;
                var ns = _d[1];
                element = _d[2];
                var position = _d[3];
                var attribute = _d[4];
                var value = _d[5];
                if (element != '') {
                    if (position == 0) { // [0] does not exists so always add the element - we still get the path though
                        newcontext = createElementNS(xp, ns, element, context, before);
                    } else if (position) {
                        var j = 1;
                        newcontext = null;
                        while (j <= position) {
                            existingelement = xp.query(ns + ':' + element + '['+ j + ']', context);
                            if (existingelement.snapshotLength) {
                                newcontext = existingelement.snapshotItem(0);
                            } else {
                                newcontext = createElementNS(xp, ns, element, context, newcontext ? newcontext.nextSibling : false);
                            }
                            j++;
                        }
                    } else {
                        newcontext = createElementNS(xp, ns, element, context, before);
                    }
                    context = newcontext;
                }
                if (attribute) {
                    // check for existence of attribute before setting - otherwise its already set value might be overwritten by undefined
                    if (!context.getAttribute(attribute) && rec != undefined && rec != '') {
                        context.setAttribute(attribute, value);
                    }
                    if (value == undefined) { newcontext = context.getAttributeNode(attribute); }
                }
            }
        }
        // adding the provided value always at end ..
        if (rec != undefined) {
            if (newcontext != null && newcontext.nodeType == Node.ATTRIBUTE_NODE) {
                newcontext.value = rec;
            } else {
                while (context.firstChild) {
                    context.removeChild(context.firstChild);
                }
                context.appendChild(document.createTextNode(rec));
            }
        }
        return context;
    };

    function createElementNS(xp, ns, element, context, before) {
        var nsfull = '';
        var prefixed = element;
        if (ns) {
            nsfull = resolver(ns);
            prefixed = ns + ':' + element;
        }
        var newelement = xp.document.createElementNS(nsfull, prefixed);
        if (before) {
            // this is a hack - have to look into it ...
            var beforewhat = typeof(before) == 'boolean' ? context.firstChild : before;
            context = context.insertBefore(newelement, beforewhat);
        } else {
            context = context.appendChild(newelement);
        }
        return context;
    }

    function myprint_r3(table) {
        var res = '';
        _.each(table, function(row) {
            var tds = '';
            _.each(row, function(col, i, r) {
                if (col.level === 1) {
                    var rec = _.find(prefixes, { 'prefix': col.val});
                    tds += '<tbody class=showandhideable2><tr><td class=showandhideable2 colspan="10">' + rec.title + '</td></tr></tbody>';
                }
                var colspan = 0;
                if ((i == r.length - 2) || col.path) {
                    colspan = 10 - col.level;
                }
                tds += '<td';
                tds += col.rows ?  ' rowspan="'+col.rows+'"'  : '';
                tds += colspan > 0 ? ' colspan="'+colspan+'"' : '';
                tds += col.path ? ' key="'+col.path+'"' : '';
                tds += col.del ? ' data-del="1"' : '';
                tds += col.dup ? ' data-dup="1"' : '';
                tds += col.key ? ' data-key="'+col.key+'"' : '';
                tds += ' data-level="'+col.level+'"';
                tds += ' data-dlevel="'+col.dlevel+'"';
                if (col.path) {
                    var superkey = col.path.replace(/^:(\w+):/, '').replace(/:(\d+):/g, ':#:').replace(/:_?$/, '');
                    var rec = _.find(mappings, { 'key': superkey});
                    if (rec.values) {
                        tds += '>'+bindings(col.path, rec.values, col.val)+'</td>';
                    } else {
                        tds += '><input type="text" name="'+col.path+'" value="'+col.val+'"/></td>';
                    }
                } else {
                    tds += '>'+col.val+'</td>';
                }

            });
            res += '<tr>'+tds+'</tr>';
        });
        return '<table>'+res+'</table>';
    }

    function DOMXPath(xmlDoc, res) {
        return {
            query: function(xpath, context) {
                return xmlDoc.evaluate(
                    xpath,
                    context,
                    res,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
            },
            document: xmlDoc,
        };
    }

    function deepdelete(obj) {
        var somethingdeleted = false;
        function inner(obj, k) {
            var empty = true;
            _.each(obj, function(value, key, obj) {
                if (_.isArray(value) || _.isObject(value)) {
                    var e = inner(value, k + ':' + key);
                    if (e) {
                        //console.log('del', value, k + ':' + key, obj);
                        delete(obj[key]);
                        somethingdeleted = true;
                    }
                    empty &= e;
                } else {
                    empty &= value === '';
                }
            });
            return empty;
        }
        inner(obj, '');
        return somethingdeleted;
    }

    function hierarchial2flat(hierachial) {
        var flat = {};
        function doit(h, key) {
            var index = 0;
            _.each(h, function(val, key2) {
                if (val == undefined) return;
                if (Number.isInteger(key2)) {
                    key2 = index++; // renumber indices - deleting an array entry does not remove the index
                }
                var key3 = key+':'+key2;

                if (_.isArray(val) || _.isObject(val)) {
                    doit(val, key3);
                } else {
                    var superkey = key3.replace(/^:(\w+):/, '$1/').replace(/:(\d+):/g, ':#:').replace(/:_?$/, '');
                    _.set(flat, [superkey, key3], val);
                }
            });
        }
        doit(hierachial, '');
        return flat;
    }

    function updatexml(e) {
        // If there is not defined a path to any XML to update,
        // then do not bother creating a string representation of the XML
        var rowIndex;

        if (!xmlDisplay) { return; }

        if (e) {
            if (e.target.oldValue === e.target.value) { return; }
            var rowIndex = e.relatedTarget.parentNode.parentNode.rowIndex;

            var superkey = e.target.name.replace(/^:(\w+):/, '$1/').replace(/:(\d+):/g, ':#:').replace(/:_?$/, '');
            var key = e.target.name.replace(/^:(\w+):/, '$1/').replace(/:_?$/, '');
            var flat = {};
            _.set(flat, [superkey, key], e.target.value);
            pairings(flat);

            var xml = hierarchize(
                flat,
                DOMXPath(newXmlDoc, resolver),
                newXmlDoc.documentElement,
                'md:Extensions/wayf:wayf/wayf:',
                prefixes,
                mappings
            );

            newXmlDoc = parser.parseFromString(new XMLSerializer().serializeToString(newXmlDoc), 'text/xml');
        }

        flat = flatten(
            DOMXPath(newXmlDoc, resolver),
            newXmlDoc.documentElement,
            'md:Extensions/wayf:wayf/wayf:',
            prefixes,
            mappings
        );

        if (!e) {
             hierachial = flat2hierarchial(flat);
             hierarchialWithDefaults(defaults, hierachial, []);
             document.querySelector(table).innerHTML = myprint_r3(tabulize(hierachial, 0, '', 0)[0]);
             updateeventlisteners();
        }
/*
        hierachial = flat2hierarchial(flat);
        if (!e || (e.target.value === '' && deepdelete(hierachial))) { // update form if anything was deleted
             hierarchialWithDefaults(defaults, hierachial, []);
             document.querySelector(table).innerHTML = myprint_r3(tabulize(hierachial, 0, '', 0)[0]);
             updateeventlisteners();
             flat = hierarchial2flat(hierachial);
             //console.log('deleted');
        }

        if (rowIndex) {
            var rows = document.querySelectorAll(table + ' tr');
            rows[rowIndex].lastChild.firstElementChild.focus();
            rows[rowIndex].lastChild.firstElementChild.select();
        }
 */

        var ed = newXmlDoc.documentElement;
        while (ed.firstChild) { ed.removeChild(ed.firstChild); }

        xml = hierarchize(
            flat,
            DOMXPath(newXmlDoc, resolver),
            newXmlDoc.documentElement,
            'md:Extensions/wayf:wayf/wayf:',
            prefixes,
            mappings
        );

        var pp = xmlpp(new XMLSerializer().serializeToString(xml), "  ");
        document.querySelector(xmlDisplay).value = pp;
    }

    function insertrows(e) {
        var td = e.target;
        var trs = parseInt(td.attributes['rowspan'].value);
        var level = parseInt(td.dataset.level);
        var key = td.nextSibling.dataset.key.replace(/(\d+)/g, '0');
        var def = document.querySelector(template+" td[data-key='"+ key +"']");
        var dup = parseInt(def.attributes['rowspan'].value);

        var srctr = def.parentNode;

        var tr = td.parentNode;
        var newtr = srctr.cloneNode(true);
        for (var i = 0; i <= td.cellIndex; i++) {
            newtr.deleteCell(0); // already in dest - later we add to it's rowspan
        }

        var srcrows = srctr.parentNode.rows;
        var rows = tr.parentNode.rows;
        var before = rows[tr.sectionRowIndex + trs];
        // get the index corresponding to the dlevel
        var last = rows[tr.sectionRowIndex + trs - 1];
        var dlevel = parseInt(td.dataset.dlevel);
        var newindices = last.lastChild.firstChild.name.match(/\d+/g); // a bit cheaky - no numerals allowed in keys

        newindices[dlevel]++;
        newtr.firstElementChild.innerHTML = newindices[dlevel];
        for (i = dlevel + 1; i < newindices.length; i++) {
            newindices[i] = 0;
        }

        // add zeroes for elements not actually present in existing record
        newindices = _.concat(newindices, [0,0,0,0,0]);

        var nth = -1;
        newtr.lastChild.firstChild.name = newtr.lastChild.firstChild.name.replace(/\d+/g, function () { nth++; return newindices[nth]; });

        tr.parentNode.insertBefore(newtr, before);
        for (i = 1; i < dup; i++) {
            newtr = srcrows[srctr.sectionRowIndex + i].cloneNode(true);
            nth = -1;
            newtr.lastChild.firstChild.name = newtr.lastChild.firstChild.name.replace(/\d+/g, function () { nth++; return newindices[nth]; });

            tr.parentNode.insertBefore(newtr, before);

        }
        td.attributes['rowspan'].value = trs + dup;

        level--;
        do {
            td = td.previousElementSibling;
            if (td == null) {
                tr = tr.previousElementSibling;
                td = tr.firstElementChild;
            }
            if (td.dataset.level < level) {
                td.attributes['rowspan'].value = parseInt(td.attributes['rowspan'].value) + dup;
                var newlevel = td.dataset.level - 1;
                while (td.dataset.level < level) {
                    td = td.nextElementSibling;
                    td.attributes['rowspan'].value = parseInt(td.attributes['rowspan'].value) + dup;
                }
                level = newlevel;
            } else if (td.dataset.level == level) {
                td.attributes['rowspan'].value = parseInt(td.attributes['rowspan'].value) + dup;
                level--;
            }
        } while (level);
        updateeventlisteners();
    }

    function saveoldvalue() {
        this.oldValue = this.value;
        focus = this;

    }

    function updateeventlisteners() {
        _.each(document.querySelectorAll("td[data-dup='1']"), function(node) {
            node.removeEventListener('click', insertrows);
            node.addEventListener('click', insertrows);
        });

        _.each(document.querySelectorAll(table + ' input'), function(node) {
            node.removeEventListener('focus', saveoldvalue);
            node.addEventListener('focus', saveoldvalue);
            node.removeEventListener('blur', updatexml);
            node.addEventListener('blur', updatexml);
        });
    }

    var parser = new DOMParser();
    var newXmlDoc = parser.parseFromString(xmlMetadata, 'text/xml');

    var flat = flatten(
        DOMXPath(newXmlDoc, resolver),
        newXmlDoc.documentElement,
        'md:Extensions/wayf:wayf/wayf:',
        prefixes,
        mappings
    );

    var defaults = mappings.reduce(function(acc, m) {
        if (m.path === '') { m.roles = ['wayf']; }
        if (m.roles.length === 0) { m.roles = ['c']; }
        for (var i = 0; i < m.roles.length; i++) {
            var mkey = m.roles[i].toUpperCase() + '/' + m.key;
            var skey = m.roles[i].toUpperCase() + '/' + m.key.replace(/#/g, 0);
            acc[mkey] = {};
            acc[mkey][skey] = '';
        }
        return acc;
    }, {});

    defaults = flat2hierarchial(defaults);
    delete defaults.WAYF;

    document.querySelector(template).innerHTML = myprint_r3(tabulize(defaults, 0, '', 0)[0]);

    updatexml();

    _.each(document.querySelectorAll(table + ' td.showandhideable2'), function(node) {
        node.addEventListener('click', function(e) {
            e.target.parentNode.parentNode.classList.toggle('closed');
            e.target.classList.toggle('closed');
        });
    });

    return {
        updatexml: updatexml,
        insertrows: insertrows,
    };

};
