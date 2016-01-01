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
    that.width = img.width;
    that.height = img.width;
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
  //Assume input already binarized, only check if R is zero
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
    for(i = 0; i < n; i += 4) if(data[i]===0) bp.amount++;
  }
  return bp;
};

handwrittenImage.prototype.viterbi = function(vertical){
// Estimate stroke width
  var iwidth = this.width;
  var iheight = this.height;
  // var strokeWidth = this.strokeWidth();
  // this.image.strokeWidth = Math.round(strokeWidth);

// divide tli into gridsPerLine*lines grids
  // var lines = vertical ? Math.ceil(iwidth / this.strokeWidth) : Math.ceil(iheight / this.strokeWidth);
  // var gridsPerLine = vertical ? Math.ceil(iheight / this.strokeWidth) : Math.ceil(iwidth / this.strokeWidth);
  this.grids = this.divideImage();
  var grids = this.grids;
  var lines = this.linesOfGrids;
  var gridsPerLine = this.gridsPerLine;
  //grids: array of lines (vertical if orientation is vertical, vice versa)
  //       (a line is an array of grids)

// // calculate needed probabilities of every grid
//   grids.map(function(lineOfGrids){
//     lineOfGrids.map(function(grid){
//       //symbol observation probability
//       var bp = blackPixels(grid).amount;
//       grid.obsProb = 1-bp/(strokeWidth^2+1);

// //TODO: calculate state transition probability
//       grid.trsProb = 0;
//     });
//   });

  var line=0;
  var grid=0;  //for loop indexing
  var initProb=0;
  var finalProb=0;
  var oneThird = Math.round(gridsPerLine/3);
  var twoThirds = Math.round(2*gridsPerLine/3);
  for(line=0;line<lines;++line){
    initProb=0;
    finalProb=0;
    for(grid=0;grid<oneThird;++grid){
      initProb += grids[line][grid].obsProb;
    }
    //initial state probability
    initProb /= oneThird;
    // console.log(initProb);
    for(grid=twoThirds;grid<gridsPerLine;++grid){
      finalProb += grids[line][grid].obsProb;
    }
    //final state probability
    finalProb /= oneThird;
    grids[line][gridsPerLine-1].pathProb.p = finalProb;
    //path probability of first line
    grids[line][0].pathProb.p = initProb * grids[line][0].obsProb;
    // console.log(grids[line][0].pathProb.p);
  }

  // path probability of central lines
  var upLine = 0;
  var thisLine = 0;
  var downLine = 0;
  var obliqueTrsProb = Math.sqrt(2)/2;
  var calculatePathProb = function(lineOfGrids, line){
      upLine = (line===0) ? 0 : grids[(line-1)][grid-1].pathProb.p * obliqueTrsProb * grids[(line-1)][grid].obsProb;
      thisLine = lineOfGrids[grid-1].pathProb.p * lineOfGrids[grid].obsProb;
      downLine = (line===(lines-1)) ? 0 : grids[(line+1)][grid-1].pathProb.p * obliqueTrsProb * grids[(line+1)][grid].obsProb;
      lineOfGrids[grid].pathProb = (thisLine>upLine) ?
                                   (thisLine>downLine?{"grid":line, "p":thisLine}:{"grid":line+1, "p":downLine}) :
                                   (upLine>downLine?{"grid":line-1, "p":upLine}:{"grid":line+1, "p":downLine});
  };
  for(grid=1;grid<gridsPerLine-1;++grid){//excluding last column
    grids.map(calculatePathProb);
  }
  // path probability of last line
  c1=this.sw;
  c2=3;
  c3=4;            // magic numbers
  var thres = Math.pow(1-(c1*c1/(1+(this.sw*this.sw))),c2)*Math.pow(1/Math.sqrt(2),c3);
  var paths = [];
  grids.map(function(lineOfGrids, line){
      upLine = (line===0) ? 0 : grids[(line-1)][grid].pathProb.p * grids[(line-1)][grid-1].pathProb.p * obliqueTrsProb * grids[(line-1)][grid].obsProb;
      thisLine = lineOfGrids[grid].pathProb.p * lineOfGrids[grid-1].pathProb.p * lineOfGrids[grid].obsProb;
      downLine = (line===(lines-1)) ? 0 : grids[(line+1)][grid].pathProb.p * grids[(line+1)][grid-1].pathProb.p * obliqueTrsProb * grids[(line+1)][grid].obsProb;
      lineOfGrids[grid].pathProb = (thisLine>upLine) ?
                                   (thisLine>downLine?{"grid":line, "p":thisLine}:{"grid":line+1, "p":downLine}) :
                                   (upLine>downLine?{"grid":line-1, "p":upLine}:{"grid":line+1, "p":downLine});
      console.log(lineOfGrids[grid].pathProb);
      if(lineOfGrids[grid].pathProb.p > thres){
        paths.push(lineOfGrids[grid].pathProb);
      }
  });
  console.log(thres);
  console.log(paths);



//   grids[lines].map(function(grid){
// //TODO: calculate path probability (we have set grid.pathProb = finalProb)
//     grid.pathProb *= 1;
//     //build path array
//     if(grid.pathProb > thres){
//       paths.push({
//         pathProb: grid.pathProb,
// //TODO: construct path object
//         passingGrids: []
//       });
//     }
//   });

//TODO: remove redundant path
  // overlap path, remove that who has lower pathProb
  paths.filter(function(path){

  });
  // continuous path, reserve central one
  paths.filter(function(path){

  });
//TODO: split image by path
};

handwrittenImage.prototype.divideImage = function(){
// TODO: divide image into m*n parts
  // var strokeWidth = Math.round(this.strokeWidth());
  var data = this.original.data;
  var h = this.image.height;
  var w = this.image.width;
  var strokeWidth = this.sw;
  var dividedImages = [];
  var gridLine = [];
  var grid = [];
  var obsProbDenominator = strokeWidth*strokeWidth+1;
  var obliqueTrsProb = Math.sqrt(2)/2;
  var x=0;
  var y=0;
  for(y=0;y<h;y+=strokeWidth){
    gridLine=[];
    for(x=0;x<w;x+=strokeWidth){
      grid = this.getData(x,y,strokeWidth,strokeWidth); //TODO: boundary needs to be concerned
      // grid=[];
      // grid.push(data.slice(((w * y) + x) * 4, ((w * y) + x + strokeWidth) * 4));
      // grid.push(data.slice(((w * y+1) + x) * 4, ((w * y+1) + x + strokeWidth) * 4));
      // grid.push(data.slice(((w * y+2) + x) * 4, ((w * y+2) + x + strokeWidth) * 4));
      // temp=new ImageData(strokeWidth,strokeWidth);
      // temp.data=grid;
      // grid=temp;
      var bp = grid.blackPixels().amount;
      //symbol observation probability
      grid.obsProb = 1-bp/obsProbDenominator;
      grid.trsProb = {};
      grid.trsProb[(y-1).toString()] = obliqueTrsProb;
      grid.trsProb[(y).toString()] = 1;
      grid.trsProb[(y+1).toString()] = obliqueTrsProb;
      grid.pathProb = {};
      gridLine.push(grid);
    }
    dividedImages.push(gridLine);
  }
  this.linesOfGrids = y/strokeWidth;
  this.gridsPerLine = x/strokeWidth;
  return dividedImages;
};