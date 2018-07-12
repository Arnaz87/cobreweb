
var types = [];

function newType (name) {
  var tp = {name: name, id: types.length, compile: function () {
    putln("// type[" + this.id + "]: " + this.name);
  }};
  types.push(tp)
  return tp
}

function BaseModule (data) {
  this.data = data
  this.get = function (name) {
    return data[name]
  }
}

function macro (str, inc, outc) { return {
  type: "macro", macro: str,
  ins: new Array(inc), outs: new Array(outc),
  use: function (args) {
    var expr = this.macro;
    for (var i = 0; i < this.ins.length; i++) {
      var patt = new RegExp("\\$" + (i+1), "g");
      expr = expr.replace(patt, args[i]);
    }
    return expr;
  }
}; }

var recordcache = {}
var arraycache = {}

var anyModule = new BaseModule({ "any": newType("any") })

var macro_modules = {
  "cobre\x1fbool": new BaseModule({
    "bool": newType("bool"),
    "true": macro("true", 0, 1),
    "false": macro("false", 0, 1),
    "not": macro("!$1", 1, 1),
  }),
  "cobre\x1fsystem": new BaseModule({
    "println": macro("console.log($1)", 1, 0),
    "error": macro("error($1)", 1, 0),
  }),
  "cobre\x1fint": new BaseModule({
    "int": newType("int"),
    "add": macro("($1 + $2)", 2, 1),
    "sub": macro("($1 - $2)", 2, 1),
    "mul": macro("($1 * $2)", 2, 1),
    "div": macro("($1 / $2)", 2, 1),
    "eq": macro("($1 == $2)", 2, 1),
    "ne": macro("($1 != $2)", 2, 1),
    "gt": macro("($1 > $2)", 2, 1),
    "lt": macro("($1 < $2)", 2, 1),
    "ge": macro("($1 >= $2)", 2, 1),
    "le": macro("($1 <= $2)", 2, 1),
  }),
  "cobre\x1fstring": new BaseModule({
    "string": newType("string"),
    "new": macro("String($1)", 1, 1),
    "itos": macro("String($1)", 1, 1),
    "concat": macro("($1 + $2)", 2, 1),
    "add": macro("($1 + $2)", 2, 1),
    "eq": macro("($1 == $2)", 2, 1),
    "length": macro("$1.length", 1, 1),
    "charat": macro("charat($1, $2)", 2, 2),
    "newchar": macro("String.fromCharCode($1)", 1, 1),
    "codeof": macro("$1.charCodeAt(0)", 1, 1),
  }),
  "cobre\x1farray": {build: function (arg) {
    var base = arg.get("0");
    var mod = arraycache[base.id];
    if (mod) return mod;
    var tp = newType("array(" + base.name + ")");
    mod = new BaseModule({
      "": tp,
      "new": macro("new Array($2).fill($1)", 2, 1),
      "empty": macro("[]", 0, 1),
      "get": macro("$1[$2]", 2, 1),
      "set": macro("$1[$2]=$3", 3, 0),
      "len": macro("$1.length", 1, 1),
      "push": macro("$1.push($2)", 2, 0),
    });
    arraycache[base.id] = mod;
    return mod;
  } },
  "cobre\x1fany": {
    build: function (arg) {
      var base = arg.get("0");
      if (!base) return anyModule;
      var id = base.id;
      return { "get": function (name) {
        if (name == "new") return macro("{val: $1, tp: " + id + "}", 1, 1);
        if (name == "test") return macro("($1.tp == " + id + ")", 1, 1);
        if (name == "get") return macro("$1.val", 1, 1);
      } };
    },
    get: function (name) {
      if (name == "any") return anyModule.data.any;
    }
  },
  "cobre\x1fnull": { build: function (arg) {
    var base = arg.get("0");
    var tp = newType("null(" + base.name + ")");
    return new BaseModule({
      "": tp,
      "null": macro("null", 0, 1),
      "new": macro("$1", 1, 1),
      "get": macro("$1", 1, 1),
      "isnull": macro("($1 === null)", 1, 1),
    });
  } },
  "cobre\x1frecord": { build: function (arg) {
    var arr = [];
    var names = [];
    var i = 0;
    while (true) {
      var a = arg.get(String(i));
      if (!a) break;
      arr.push(a.id);
      names.push(a.name);
      i++;
    }
    var id = arr.join(",");

    var mod = recordcache[id];
    if (mod) return mod;

    var tp = newType("record(" + names.join(",") + ")");

    mod = { "get": function (name) {
      if (name == "new") {
        return {ins: [], outs: [0], use: function (args) {
          return "[" + args.join(", ") + "]";
        }};
      }
      var a = name.slice(0, 3);
      var n = name.slice(3);
      if (a == "") return tp;
      if (a == "get") return macro("$1[" + n + "]", 1, 1);
      if (a == "set") return macro("$1[" + n + "] = $2", 2, 0);
    } };

    recordcache[id] = mod;
    return mod;
  } },
  "cobre\x1ftypeshell": {build: function (arg) {
    // Each time it's called, a new type is created
    return new BaseModule({
      "": newType("typeshell"),
      "new": macro("$1", 1, 1),
      "get": macro("$1", 1, 1),
    });
  } },
  "cobre\x1ffunction": { build: function (arg) {
    var inlist = [];
    var innames = [];
    var outlist = [];
    var outnames = [];

    var i = 0;
    while (true) {
      var a = arg.get("in" + String(i));
      if (!a) break;
      inlist.push(a.id);
      innames.push(a.name);
      i++;
    }

    var i = 0;
    while (true) {
      var a = arg.get("out" + String(i));
      if (!a) break;
      outlist.push(a.id);
      outnames.push(a.name);
      i++;
    }

    var id = inlist.join(",") + "->" + outlist.join(",");

    var mod = recordcache[id];
    if (mod) return mod;

    var tp = newType("(" + innames.join(",") + ")->(" + outnames.join(",") + ")");

    var abc = "abcdefghijklmnopqrstuvwxyz"
    var argnames = abc.split("").slice(0, inlist.length)

    function createDefinition (fn, last) {
      var args = argnames.slice()
      if (last) args.push(last)
      return "(function (" + argnames.join(",") + ") {return " + fn.use(args) + "})"
    }

    mod = new BaseModule({
      "": tp,
      "apply": {
        ins: inlist,
        outs: outlist,
        use: function (fargs) {
          return fargs[0] + "(" + fargs.slice(1).join(", ") + ")"
        }
      },
      "new": { build: function (args) {
        var fn = args.get("0")

        return new BaseModule({"": {
          ins: inlist,
          outs: outlist,
          use: function (fargs) { return (fn instanceof Code)? fn.name : createDefinition(fn) }
        }})
      } },
      closure: {
        "build": function (args) {
          var fn = args.get("0")

          return new BaseModule({"new": {
            ins: inlist,
            outs: outlist,
            use: function (fargs) {
              var def = createDefinition(fn, "this")
              return def + ".bind(" + fargs[0] + ")"
            }
          }});
        }
      }
    });
    mod.name = "function" + tp.name
    recordcache[id] = mod;
    return mod;
  } },
}

exports.macro = macro
exports.modules = macro_modules