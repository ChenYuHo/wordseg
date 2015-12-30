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
    that.original = that.getData(0, 0, img.width, img.height);
    that.sw = Math.round(that.strokeWidth());
  };
  img.src = src;
  // cache these
  this.context = context;
  this.image = img;
}

handwrittenImage.prototype.getData = function(x,y,width,height) {
  return this.context.getImageData(x, y, width, height);
};

handwrittenImage.prototype.setData = function(data) {
  return this.context.putImageData(data, 0, 0);
};

handwrittenImage.prototype.reset = function() {
  this.setData(this.original);
};

handwrittenImage.prototype.orientation = function(){
//TODO: detect orientation
};

handwrittenImage.prototype.otsu = function(){
//TODO: binarization using Otsu method
};

handwrittenImage.prototype.strokeWidth = function() {
  var blackPixels = this.original.blackPixels(true);
  var bp = blackPixels.amount;
  var wp = blackPixels.rightDownBlack;
  var width = bp/(bp-wp);
  return width;
};

ImageData.prototype.blackPixels = function(calculateRightDown){
  var data = this.data;
  var h = this.height;
  var w = this.width;
  var bp={amount: 0};
  var i=0,n=data.length;
  if(calculateRightDown){
    bp.rightDownBlack=0;
    for(var y = 0; y < h; y++) {
      // loop through each column
      for(var x = 0; x < w-1; x++) {  //not visiting last column cause no "right" point
        if(data[((w * y) + x) * 4]===0){
          bp.amount++;
          if(data[((w * y) + x+1) * 4]===0 && data[((w * (y+1)) + x) * 4]===0)// && data[((w * (y+1)) + x+1) * 4]===0)
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

handwrittenImage.prototype.viterbi = function(vertical){
// Estimate stroke width
  var iwidth = this.image.width;
  var iheight = this.image.height;
  // var strokeWidth = this.strokeWidth();
  // this.image.strokeWidth = Math.round(strokeWidth);

// divide tli into gridsPerLine*lines grids
  var lines = vertical ? Math.ceil(iwidth / this.strokeWidth) : Math.ceil(iheight / this.strokeWidth);
  var gridsPerLine = vertical ? Math.ceil(iheight / this.strokeWidth) : Math.ceil(iwidth / this.strokeWidth);
  this.image.grids = this.divideImage(lines,gridsPerLine);
  var grids = this.image.grids;
  //grids: array of lines (vertical if orientation is vertical, vice versa)
  //       (a line is an array of grids)

// calculate needed probabilities of every grid
  grids.map(function(lineofGrids){
    lineofGrids.map(function(grid){
      //symbol observation probability
      var bp = blackPixels(grid).amount;
      grid.obsProb = 1-bp/(strokeWidth^2+1);

//TODO: calculate state transition probability
      grid.trsProb = 0;
    });
  });

  var line=0;
  var grid=0;  //for loop indexing
  for(line=0;line<lines;++line){
    var initProb=0;
    var finalProb=0;
    var oneThird = Math.round(gridsPerLine/3);
    for(grid=0;grid<oneThird;++grid){
      initProb += grids[line][grid].obsProb;
    }
    //initial state probability
    initProb /= oneThird;
    for(grid=Math.round(2*gridsPerLine/3);grid<gridsPerLine;++grid){
      finalProb += grids[line][grid].obsProb;
    }
    //final state probability
    finalProb /= oneThird;
    grids[line][gridsPerLine].pathProb = finalProb;
    //path probability of first line
    grids[line][0].pathProb = initProb * grids[line][0];
  }

  // path probability of central lines
  for(line=1;line<grids.length-1;++line){
//TODO: calculate path probility based on pathProb, trsProb, obsProb
    grids[line].map();
  }
  // path probability of last line
  c1=strokeWidth;
  c2=3;
  c3=4;            // magic numbers
  var thres = ((1-(c1^2/(1+strokeWidth^2)))^c2)*(1/Math.sqrt(2))^c3;
  var paths = [];
  grids[lines].map(function(grid){
//TODO: calculate path probability (we have set grid.pathProb = finalProb)
    grid.pathProb *= 1;
    //build path array
    if(grid.pathProb > thres){
      paths.push({
        pathProb: grid.pathProb,
//TODO: construct path object
        passingGrids: []
      });
    }
  });

//TODO: remove redundant path
  // overlap path, remove that who has lower pathProb
  paths.filter(function(path){

  });
  // continuous path, reserve central one
  paths.filter(function(path){

  });
//TODO: split image by path
};

handwrittenImage.prototype.divideImage = function(lines,gridsPerLine){
// TODO: divide image into m*n parts
  // var strokeWidth = Math.round(this.strokeWidth());
  var h = this.image.height;
  var w = this.image.width;
  var data = this.original.data;
  var strokeWidth = this.sw;
  var dividedImages = [];
  var gridLine = [];
  var grid = [];
  var gridImageData;
  var obsProbDenominator = strokeWidth*strokeWidth+1;
  var x=0;
  var y=0;
  for(y=0;y<h;y+=strokeWidth){
    gridLine=[];
    for(x=0;x<w;x+=strokeWidth){
      grid = this.getData(x,y,strokeWidth,strokeWidth);
      var bp = grid.blackPixels().amount;
      //symbol observation probability
      grid.obsProb = 1-bp/obsProbDenominator;
      gridLine.push(grid);
    }
    dividedImages.push(gridLine);
  }
  // for(y = 0; y < h; y+=this.strokeWidth) {
  //   // loop through each column
  //   gridLine = [];
  //   for(x = 0; x < w; x+=this.strokeWidth) {
  //     grid = [];
  //     for(var i = y;i<y+this.strokeWidth;++i){
  //       grid.push(data.slice(((w * i) + x) * 4, ((w * i) + x + this.strokeWidth) * 4));
  //     }
  //     // gridImageData = new ImageData(x%this.strokeWidth,i);
  //     gridImageData.data = grid;
  //     gridLine.push(gridImageData);
  //   }
  //   dividedImages.push(gridLine);
  // }
  return dividedImages;
};