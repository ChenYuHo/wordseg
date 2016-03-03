function $(id) {return document.getElementById(id);}
function handwrittenImage(canvas, src) {
  // load image in canvas
  var context = canvas.getContext('2d');
  var img = new Image();
  img.crossOrigin = "Anonymous";  //disable this row if image is in same server.
  var that = this;
  img.onload = function(){
    canvas.width = img.width;
    canvas.height = img.height;
    that.width = img.width;
    that.height = img.height;
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

handwrittenImage.prototype.reDraw = function(){
  this.context.drawImage(this.image, 0, 0, this.width, this.height);
};

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
        if(data[((w * y) + x) * 4]===0 &&data[((w * y) + x) * 4 +3]===255){
          bp.amount++;
          if(data[((w * y) + x+1) * 4]===0 && data[((w * y) + x+1) * 4+3]===255 && data[((w * (y+1)) + x) * 4]===0 && data[((w * (y+1)) + x) * 4 +3]===255)// && data[((w * (y+1)) + x+1) * 4]===0)
            bp.rightDownBlack++;
        }
      }
      if(data[((w * y) + x) * 4]===0) bp.amount++;  //visit last column 
    }
  }else{
    for(i = 0; i < n; i += 4) if(data[i]===0 && data[i+3]===255) bp.amount++;
  }
  return bp;
};

handwrittenImage.prototype.viterbi = function(vertical){
// Estimate stroke width
  var iwidth  = this.width;
  var iheight = this.height;

// divide tli into row*col grids
  this.grids = this.divideImage();
  var grids = this.grids;
  var rows = this.rows;
  var cols = this.cols;
  //grids: array of rows (vertical if orientation is vertical, vice versa)
  //       (a row is an array of grids)

// // calculate needed probabilities of every grid
//   grids.map(function(rowOfGrids){
//     rowOfGrids.map(function(grid){
//       //symbol observation probability
//       var bp = blackPixels(grid).amount;
//       grid.obsProb = 1-bp/(strokeWidth^2+1);

// //TODO: calculate state transition probability
//       grid.trsProb = 0;
//     });
//   });

  var row=0;
  var grid=0;  //for loop indexing
  var col=0;
  var initProb=0;
  var finalProb=0;
  var oneThird = Math.round(cols/3);     //first one third
  var twoThirds = Math.round(2*cols/3);  //last one third
  for(row=0;row<rows;++row){
    initProb=0;// i.e., π
    finalProb=0;//i.e., Ɣ
    for(col=0;col<oneThird;++col){
      initProb += grids[row][col].obsProb;
    }
    //initial state probability
    initProb /= oneThird;
    // console.log(initProb);
    for(col=twoThirds;col<cols;++col){
      finalProb += grids[row][col].obsProb;
    }
    //final state probability
    finalProb /= oneThird;  //average
    grids[row][cols-1].pathProb.p = finalProb;
    //path probability of first row
    grids[row][0].pathProb.p = initProb * grids[row][0].obsProb;
    // console.log(grids[row][0].pathProb.p);
  }

  // path probability of central rows
  var prevRow = 0;
  var thisRow = 0;
  var nextRow = 0;
  var obliqueTrsProb = (Math.sqrt(2))/2;  // control if oblique path is allowed
  var calculatePathProb = function(rowOfGrids, row){
      prevRow = (row===0) ? 0 : grids[(row-1)][col-1].pathProb.p * obliqueTrsProb * rowOfGrids[col].obsProb;
      thisRow = rowOfGrids[col-1].pathProb.p * rowOfGrids[col].obsProb;
      nextRow = (row===(rows-1)) ? 0 : grids[(row+1)][col-1].pathProb.p * obliqueTrsProb * rowOfGrids[col].obsProb;
      rowOfGrids[col].pathProb = (thisRow>=prevRow) ?
                                   (thisRow>=nextRow?{"prevRow":row, "p":thisRow}:{"prevRow":row+1, "p":nextRow}) :
                                   (prevRow>=nextRow?{"prevRow":row-1, "p":prevRow}:{"prevRow":row+1, "p":nextRow});
      // console.log(rowOfGrids[col].pathProb);
  };
  for(col=1;col<cols-1;++col){//excluding last column
    grids.map(calculatePathProb);
  }
  c1=this.sw;
  c2=3;
  c3=4;            // magic numbers
  // var thres = 0.1;
  // var thres = Math.pow(1-(c1*c1/(1+(this.sw*this.sw))),c2)*Math.pow(1/Math.sqrt(2),c3);
  var paths = [];
  // a path records starting row, point, and its probability
  
  grids.map(function(rowOfGrids, row){  //deal with the last column
      prevRow = (row===0) ? 0 : rowOfGrids[col].pathProb.p * grids[(row-1)][col-1].pathProb.p * obliqueTrsProb * rowOfGrids[col].obsProb;
      thisRow = rowOfGrids[col].pathProb.p * rowOfGrids[col-1].pathProb.p * rowOfGrids[col].obsProb;
      nextRow = (row===(rows-1)) ? 0 : rowOfGrids[col].pathProb.p * grids[(row+1)][col-1].pathProb.p * obliqueTrsProb * rowOfGrids[col].obsProb;
      rowOfGrids[col].pathProb = (thisRow>prevRow) ?
                                   (thisRow>nextRow?{"thisRow": row, "prevRow":row, "p":thisRow}:{"thisRow": row, "prevRow":row+1, "p":nextRow}) :
                                   (prevRow>nextRow?{"thisRow": row, "prevRow":row-1, "p":prevRow}:{"thisRow": row, "prevRow":row+1, "p":nextRow});
      // if(rowOfGrids[col].pathProb.p > thres){
        paths.push(rowOfGrids[col].pathProb);
      // }
      // console.log(rowOfGrids[col].pathProb);
  });
  this.paths = paths;
  // this.trackPath();
  this.drawPaths();


//   grids[rows].map(function(grid){
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

handwrittenImage.prototype.trackPath = function(){
  var cols = this.cols;
  var grids = this.grids;
  this.paths.map(function(path){
    path.route = [];
    var row = path.thisRow;
    var col = cols-1;
    path.route.push({"row":row, "col":col});
    grids[row][col].pathsThrough.push(path.thisRow);
    row = path.prevRow;
    for(col=col-1;col>=0;--col){  //backtracking
      path.route.push({"row":row, "col":col});
      grids[row][col].pathsThrough.push(path.thisRow);
      row = grids[row][col].pathProb.prevRow;
    }
    path.route.reverse();
  });
};

handwrittenImage.prototype.drawPaths = function(){
  var col = 0;
  var context = this.context;
  var cols = this.cols;
  var grids = this.grids;
  var sw = this.sw;
  var now = {};
  var next = {};
  var row = 0;
  var width = this.width;
  this.paths.map(function(p){
    now.x = width;
    row = p.thisRow;
    now.y = sw*(p.thisRow+1)-sw/2;
    for(col=cols-1;col>0;--col){  //backtracking
      next.x = now.x - sw;
      row = grids[row][col].pathProb.prevRow;
      next.y = sw*(row+1)-sw/2;
      // console.log(now);
      // console.log(next);
      context.moveTo(now.x, now.y);
      context.lineTo(next.x, next.y);
      context.strokeStyle = '#ff0000';
      context.stroke();
      now.x = next.x;
      now.y = next.y;
    }
    // do{
    //   next.x = now.x - sw;
    //   row = grids[row][col--].pathProb.grid;
    //   // col -= 1;
    //   next.y = sw*(row+1)-sw/2;
    //   context.beginPath();
    //         // console.log(now);
    //         // console.log(next);
      // context.moveTo(now.x, now.y);
      // context.lineTo(next.x, next.y);
      // context.strokeStyle = '#ff0000';
      // context.stroke();
      // now = next;
    // }while(now.x>0);
    // for(col = cols; col>0 ; --col){
    //   next.x = sw*col-sw-sw/2;
    //   next.y = sw*(grids[p.row][col-1].grid)-sw/2;
    //   context.beginPath();
    //   // console.log("from %d, %d", col, p.row);
    //   context.moveTo(now.x, now.y);
    //   // console.log("to %d, %d", col-1, p.grid);
    //   context.lineTo(next.x, next.y);
    //   // set row color
    //   context.strokeStyle = '#ff0000';
    //   context.stroke();
    //   now = next;
    // }
  });
};


handwrittenImage.prototype.divideImage = function(){
// TODO: divide image into row*col grids
  var data = this.original.data;
  var h = this.image.height;
  var w = this.image.width;
  var strokeWidth = this.sw;
  var dividedImages = [];
  var row = [];
  var grid = [];
  var obsProbDenominator = strokeWidth*strokeWidth+1;
  // var obliqueTrsProb = Math.sqrt(2)/2;
  var x=0;
  var y=0;
  for(y=0;y<h;y+=strokeWidth){
    row=[];
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
      //symbol observation probability, i.e., b
      grid.obsProb = 1-bp/obsProbDenominator;
      // grid.trsProb = {};
      // grid.trsProb[(y-1).toString()] = obliqueTrsProb;
      // grid.trsProb[(y).toString()] = 1;
      // grid.trsProb[(y+1).toString()] = obliqueTrsProb;
      // initialize probability of node at specific col, i.e., δ
      grid.pathProb = {};
      grid.pathsThrough = [];
      row.push(grid);
    }  //every row contains col grids
    dividedImages.push(row);
  }
  this.rows = y/strokeWidth;
  this.cols = x/strokeWidth;
  return dividedImages;
};