
export default function generateBmp(canvas, depth) {
  depth = depth || 1; //默认深度为1，即2色图
  var ctx = canvas.getContext('2d');
  var imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  var b = []; //bmp图的颜色阵列
  //canvas imagedata是从上到下，从左到右开始的，而bmp是从下到上，从左到右算的, 不过qr二维码，位置没关系都可以扫出来
  //att. 每一行的末尾通过填充若干个字节的数据（并不一定为0）使该行的长度为4字节的倍数。像素数组读入内存后，每一行的起始地址必须为4的倍数。
  //这个限制仅针对内存中的像素数组，针对存储时，仅要求每一行的大小为4字节的倍数，对文件的偏移没有限制。

  for (var i = canvas.height - 1; i >= 0; i--) {
    //for(var i = 0; i < canvas.height; i++){
    var rowArr = [];
    for (var j = 0; j < canvas.width; j++) {
      //canvas imagedata是按RGBA照顺序排列的数组，每一个的取值都是0-255
      var index = i * canvas.width * 4 + j * 4; //这个点RGBA的起始索引
      //若深度低于8，有调色板，则按区间划分颜色，颜色数据代表在调色板中的索引
      if (depth <= 8) {
        //直接每隔一个固定的位置取一个颜色来作为调色板
        var gap = Math.floor(255 / (Math.pow(2, depth) - 1));
        //随意取一个平均值作为调色板的颜色选择...
        var paletteIndex = Math.floor((imagedata[index] + imagedata[index + 1] + imagedata[index + 2]) / gap / 3);
        rowArr.push(paletteIndex);
      }
      //这种没有调色板, 2个字节来表示颜色显然不够，用A1R5G5B5格式，即RGB分别占5位、5位、5位
      //其他分色(比如可以设置R5G6B5)还有设置掩码的姿势，需要用另外的DIB头，但是我试不出来。。。放弃
      else if (depth == 16) {
        //总共本来有256种颜色，现在只能展示其中的32种
        //PS上16色可以很逼近24色，应该是有什么算法
        var red = Math.ceil(imagedata[index] / 255 * 0x1f);
        var green = Math.ceil(imagedata[index + 1] / 255 * 0x1f);
        var blue = Math.ceil(imagedata[index + 2] / 255 * 0x1f);

        rowArr.push(((green & 0x07) << 5) + blue)
        rowArr.push(0x00 + (red << 2) + (green >> 3));
      }
      //24或者32(带alpha通道)
      else {
        //由于不支持alpha通道...所以采用模拟计算方式来制造alpha效果
        var alpha = (depth == 32 ? imagedata[index + 3] : 255) / 255;
        //顺序是BGRA ... 为什么要这么特立独行?查了半天才发现
        rowArr.push(imagedata[index + 2] * alpha + (1 - alpha) * 255);
        rowArr.push(imagedata[index + 1] * alpha + (1 - alpha) * 255);
        rowArr.push(imagedata[index] * alpha + (1 - alpha) * 255);
        depth == 32 && rowArr.push(imagedata[index + 3]) //这句话并没有用
      }
    }
    //深度小于等于8的情况下，将索引再合并到1个字节中
    //1深度 1个字节代表8个像素，分别为在2个颜色的调色板中的索引
    //2深度 1个字节代表4个像素，分别为在4个颜色的调色板中的索引
    //4深度 1个字节代表2个像素，分别为在16个颜色的调色板中的索引
    //8深度 1个字节代表1个像素，分别为在256个颜色的调色板中的索引
    if (depth <= 8) {
      var tmpArr = [];
      var colorIn8Bits = Math.floor(8 / depth);
      for (var k = 0, len = rowArr.length; k < len; k += colorIn8Bits) {
        var _byte = 0;
        for (var l = 0; l < colorIn8Bits; l += 1) {
          _byte += rowArr[k + l] << (colorIn8Bits - l - 1);
        }
        tmpArr.push(_byte);
      }
      rowArr = tmpArr;
    }

    var totalRowArrLength = Math.floor((depth * canvas.width + 31) / 32) * 4; //一行总共需要的位数
    //不够就补够0
    while (totalRowArrLength > rowArr.length) {
      rowArr.push(0);
    }
    b = b.concat(rowArr);
  }

  return genBase64(b, depth, canvas.width, canvas.height);
}

function genBase64(arr, depth, width, height) {
  var offset, height, data, image;

  //little endian小端方式, 返回4字节数据
  function conv(size) {
    return String.fromCharCode(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff);
  }

  //小于等于8深度的BMP图形，有调色板段落，调色板段落字节数为Math.pow(2,depth)种颜色, 每个颜色RGBX 共4字节表示,X都为0
  offset = depth <= 8 ? 54 + Math.pow(2, depth) * 4 : 54; //位图数据偏移地址
  // -----位图文件头开始-----
  //BMP Header
  data = 'BM'; // ID field  0-1  2 bytes，0x42 0x4D
  data += conv(offset + Math.ceil(width * height * depth / 8)) // BMP大小，单位字节  2-5 4 bytes
  data += conv(0); // 保留字段 6-9  4 bytes 设为0
  data += conv(offset); // 位图数据（像素数组）的地址偏移，也就是起始地址 A-D 4bytes
  // -----位图文件头结束-----

  // -----DIB头开始------
  data += conv(40); // DIB头大小, 40个字节, E-11, 4字节
  data += conv(width); // 位图宽度，单位是像素, 12-15, 4字节
  data += conv(height); // 位图高度，单位是像素, 16-19, 4字节
  data += String.fromCharCode(1, 0); // 色彩平面数；只有1为有效值, 1A-1B 2字节
  data += String.fromCharCode(depth, 0); // 每个像素所占位数，即图像的色深。典型值为1、4、8、16、24和32, 1C-1D, 2字节
  data += conv(0); // 所使用的压缩方法, 0代表无, 1E-21, 4字节
  data += conv(arr.length); // 图像大小.指原始位图数据的大小,与文件大小不是同一个概念, 22-25, 4字节
  data += conv(0); // 图像的横向分辨率，单位为像素每米（有符号整数） 26-29, 4字节
  data += conv(0); // 图像的纵向分辨率，单位为像素每米（有符号整数） 2A-2D, 4字节
  data += conv(0); // 调色板的颜色数, 0 == 2^n ,2E-31, 4字节
  data += conv(0); // 重要颜色数，为0时表示所有颜色都是重要的；通常不使用本项 32-35, 4字节
  // -----DIB头结束------

  //depths <= 8的需要调色板
  if (depth <= 8) {
    data += conv(0); //黑色
    //其他调色板颜色,
    for (var s = Math.floor(255 / (Math.pow(2, depth) - 1)), i = s; i < 256; i += s) {
      data += conv(i + i * 256 + i * 65536);
    }
  }
  //像素数据
  //data += String.fromCharCode.apply(String, arr); 不使用这个方法是因为arr太长导致Maximum call stack size exceeded
  //也可以分段来，不过速度没什么提升
  for (var i = 0, len = arr.length; i < len; i++)
    data += String.fromCharCode(arr[i]);
  //拼凑完毕，返回base64
  return 'data:image/bmp;base64,' + btoa(data);
}