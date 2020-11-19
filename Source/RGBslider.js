// Code By Webdevtrick ( https://webdevtrick.com )
var body = document.body,
r = document.querySelector('#r'),
g = document.querySelector('#g'),
b = document.querySelector('#b'),
outputR = document.querySelector('#outputR'),
outputG = document.querySelector('#outputG'),
outputB = document.querySelector('#outputB'),
hexVal_out = document.querySelector('#hexVal');

function setColor(){
  var r_hexVal = parseInt(r.value, 10).toString(16),
      g_hexVal = parseInt(g.value, 10).toString(16),
      b_hexVal = parseInt(b.value, 10).toString(16),
      hexVal = "#" + pad(r_hexVal) + pad(g_hexVal) + pad(b_hexVal);
      document.getElementById("hexVal").style.backgroundColor = hexVal;
      document.getElementById("changeBg").style.backgroundColor = hexVal;
      //body.style.backgroundColor = hexVal;
      hexVal_out.value = hexVal;
}

function pad(n){
  return (n.length<2) ? "0"+n : n;
}

r.addEventListener('change', function() {
  setColor();
  outputR.value = r.value;
}, false);

r.addEventListener('input', function() {
  setColor();
  outputR.value = r.value;
}, false);

g.addEventListener('change', function() {
  setColor();
  outputG.value = g.value;
}, false);

g.addEventListener('input', function() {
  setColor();
  outputG.value = g.value;
}, false);

b.addEventListener('change', function() {
  setColor();
  outputB.value = b.value;
}, false);

b.addEventListener('input', function() {
  setColor();
  outputB.value = b.value;
}, false);
