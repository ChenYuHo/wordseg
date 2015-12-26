function $(id) {return document.getElementById(id);}
function handwrittenImage(canvas, src) {
  // load image in canvas
  var context = canvas.getContext('2d');
  var img = new Image();
  img.crossOrigin = "Anonymous";  //disable this line if image is in same server.
  var that = this;
  img.onload = function(){
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0, img.width, img.height);
    // remember the original pixels
    that.original = that.getData();
  };
  img.src = src;
  // cache these
  this.context = context;
  this.image = img;
}

handwrittenImage.prototype.getData = function() {
  return this.context.getImageData(0, 0, this.image.width, this.image.height);
};

handwrittenImage.prototype.setData = function(data) {
  return this.context.putImageData(data, 0, 0);
};

handwrittenImage.prototype.reset = function() {
  this.setData(this.original);
};

handwrittenImage.prototype.strokeWidth = function() {
  var blackPixels = this.blackPixels(true);
  var bp = blackPixels.amount;
  var wp = blackPixels.rightDownBlack;
  var width = bp/(bp-wp);
  return width;
};

handwrittenImage.prototype.blackPixels = function(calculateRightDown){
  var data = this.original.data;
  var h = this.image.height;
  var w = this.image.width;
  var bp={amount: 0};
  var i=0,n=data.length;
  if(calculateRightDown){
    bp.rightDownBlack=0;
    for(var y = 0; y < h; y++) {
      // loop through each column
      for(var x = 0; x < w-1; x++) {  //not visiting last column cause no "right" point
        if(data[((w * y) + x) * 4]===0){
          bp.amount++;
          if(data[((w * y) + x+1) * 4]===0 && data[((w * (y+1)) + x) * 4]===0 && data[((w * (y+1)) + x+1) * 4]===0)
            bp.rightDownBlack++;
        }
      }
      if(data[((w * y) + x) * 4]===0) bp.amount++;  //visit last column 
    }
  }else{
    for(i = 0; i < n; i += 4) {
      if(data[i]===0) bp.amount++;
    }
  }
  return bp;
};