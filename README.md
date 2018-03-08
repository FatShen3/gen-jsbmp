# gen-jsbmp
a javascript lib to generate different depth of bmp image

# how to use

## install

```bash
npm i -S gen-jsbmp
```

## commonjs

```javascript
const jsbmp = require('gen-jsbmp')
```

## in browser

```html
<script src = "jsbmp.js">
```

## es2015

```javascriot
import jsbmp from 'gen-jsbmp'
```

## API

var bmp_base64 = jsmap(canvas, depth)

* <b>canvas</b>: The original picture container
* <b>depth</b>: The depth of bmp image, can be one of 1,2,4,8,16,24,32. Default to be 1.

## example

```javascript
var depthArr = [1, 2, 4, 8, 16, 24, 32]
var canvas = document.createElement('canvas')
var img = new Image()
img.src = 'test.png'
img.onload = function () {
	canvas.width = img.width, canvas.height = img.height
	var ctx = canvas.getContext('2d')
	ctx.drawImage(img, 0, 0)
	depthArr.forEach(function(depth) {
	  var img = new Image()
	  document.body.appendChild(img)
	  img.src = jsbmp(canvas, depth)
	})
}

```
