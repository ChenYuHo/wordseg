// Text-line images (tli)
//        ↓
// Estimate stroke width
//        ↓
// divide tli into m*n grids
//        ↓
// calculate needed probabilities
//        ↓
// detect best segmentation path(viterbi)
//        ↓
// determine candidate segmentation
// 
// inputs are processed line images
function main(image, vertical){

// Estimate stroke width
	var iwidth = image.width;
	var iheight = image.height;
	var strokeWidth = strokeWidth(image);

// divide tli into gridsPerLine*lines grids
	var lines = vertical ? Math.ceil(iwidth / strokeWidth) : Math.ceil(iheight / strokeWidth);
	var gridsPerLine = vertical ? Math.ceil(iheight / strokeWidth) : Math.ceil(iwidth / strokeWidth);
	var grids = divideImage(image,lines,gridsPerLine);
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
}




function strokeWidth(image){
	var blackPixels = blackPixels(image);
	var bp = blackPixels.amount;
	var wp = blackPixels.rightDownBlack;
	var width = bp/(bp-wp);
	return width;
}

function blackPixels(image){
// TODO: scan image, find black points 
//       and record those whose right, down, right down are all black

	return {
		amount: 1,
		rightDownBlack: 1
	};
}

function divideImage(image,lines,gridsPerLine){
// TODO: divide image into m*n parts
//       notice orientation (vertical line if orientation is vertical, vice versa)
	return dividedImages;
}