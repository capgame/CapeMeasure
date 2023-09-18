const VIDEO_WIDTH  = 1920;
const VIDEO_HEIGHT = 1080;

const SHRINK_WIDTH = 640;
const SHRINK_HEIGHT = 480;

let app;

window.onload = function(){
	app = new App();
	app.setCutSize(35,21,1200,898);
};


class App{
	constructor(){
		this.main = new Main();
		this.currentTab = "main";	//"config" | "main"

		this.video = document.querySelector("#video");
		this.originalCanvas = document.querySelector("#original");
		this.originalContext = this.originalCanvas.getContext("2d");

		this.adjustedCanvas = document.querySelector("#adjusted");
		this.adjustedContext = this.adjustedCanvas.getContext("2d");

		this.infoCanvas = document.querySelector("#compare-info");
		this.infoContext = this.infoCanvas.getContext("2d");

		this.cutSize = {
			left: 0,
			top: 0,
			width: VIDEO_WIDTH,
			height: VIDEO_HEIGHT,
		}
		this.drag = {
			isDragging: false,
			begin: [0,0],
			end: [0,0],
		}

		this.init();
	}
	init(){
		this.initCamera();
		this.initCanvas();
		let loop = () => {
			this.process();
			setTimeout(loop,533 - Date.now() % 533);
		};
		loop();
	}
	initCamera(){
		navigator.mediaDevices
			.getUserMedia({
				video: true,
				audio: false,
			})
			.then((stream) => {
				this.video.srcObject = stream;
				this.video.play();
			}).catch(e => console.log(e));
	}

	initCanvas(){
		this.originalCanvas.addEventListener("mousedown",e => {
			this.drag.isDragging = true;
			this.drag.begin = this.calcPosOnCanvas(e);
		});
		this.originalCanvas.addEventListener("mousemove",e => {
			this.drag.end = this.calcPosOnCanvas(e);
		});
		this.originalCanvas.addEventListener("mouseup",e => {
			this.drag.isDragging = false;
			this.drag.end = this.calcPosOnCanvas(e);
			console.log(this.drag.begin,this.drag.end)
			const dragWidth = this.drag.end[0] - this.drag.begin[0];
			const dragHeight = this.drag.end[1] - this.drag.begin[1];
			const dragSize   = [dragWidth,dragHeight]
			this.setCutSize(...this.drag.begin,...dragSize);
			
		});
		
		this.originalContext.fillStyle = "rgba(232, 133, 130, 0.8)";
		
		this.infoContext.strokeStyle = "#ff0000";
		this.infoContext.lineWidth = 3;
		this.infoContext.font = "18px 'Kosugi Maru'"
	}
	process(){
		this.drawVideoToCanvas();
		const info = this.main.measure(this.adjustedContext);

		console.log(info);
		const c = this.infoContext;
		const sourceSize = this.main.sourceSize;

		c.clearRect(0,0,1100,480)
		c.putImageData(info.target,0,0);
		c.putImageData(info.source,SHRINK_WIDTH + 20,0);
		
		for(let i = 0;i < 6;i++){	//枠線
			c.fillRect(0,sourceSize.height * i,1100,2);
		}

		for(let i = 1;i < 6;i++){
			c.strokeRect(info.closestPixels[i].pixel,sourceSize.height * i,sourceSize.width,sourceSize.height);
		
			let isReliable = true;
			this.infoContext.font = "18px 'Kosugi Maru'"

			if(info.closestPixels[i].diff > 800000){
				c.fillStyle = "#ff0000";
				isReliable = false;
			}else{
				c.fillStyle = "#000000";
			}

			c.fillText(" DIFF:" + info.closestPixels[i].diff,SHRINK_WIDTH + sourceSize.width + 20,sourceSize.height * i + 55);
			
			if(info.closestPixels[i].samePixels > 25600 * 0.9){
				c.fillStyle = "#ff0000";
				isReliable = false;
			}else{
				c.fillStyle = "#000000";
			}
			c.fillText(" MONO:" + info.closestPixels[i].samePixels,SHRINK_WIDTH + sourceSize.width + 20,sourceSize.height * i + 75);
			
			this.infoContext.font = "30px 'Kosugi Maru'"
			if(!isReliable){
				c.fillStyle = "#aaaaaa";
				c.fillText(info.closestPixels[i].speed,SHRINK_WIDTH + sourceSize.width + 45,sourceSize.height * i + 30);
				c.fillRect(SHRINK_WIDTH + sourceSize.width + 42,sourceSize.height * i + 18,67,2)
			}else{
				c.fillStyle = "#000000";
				c.fillText(info.closestPixels[i].speed,SHRINK_WIDTH + sourceSize.width + 45,sourceSize.height * i + 30);
			}
		
		}

		if(this.drag.isDragging){
			const dragWidth  = this.drag.end[0] - this.drag.begin[0];
			const dragHeight = this.drag.end[1] - this.drag.begin[1];
			const dragSize   = [dragWidth,dragHeight]
			this.originalContext.fillRect(...this.drag.begin,...dragSize)
		}
	}
	drawVideoToCanvas(){
		this.originalContext.drawImage(this.video,0,0);
		
		const cs = this.cutSize;
		const cutArg = [cs.left,cs.top,cs.width,cs.height]
		this.adjustedContext.drawImage(this.video,...cutArg,0,0,SHRINK_WIDTH,SHRINK_HEIGHT);
	}

	setCutSize(left,top,width,height){
		left   = Math.max(0,parseInt(left));
		top    = Math.max(0,parseInt(top));
		width  = Math.min(VIDEO_WIDTH,parseInt(width));
		height = Math.min(VIDEO_HEIGHT,parseInt(height));
		if(width < 0){
			left += width;
			width = Math.abs(width);
		}
		if(height < 0){
			top += height;
			height = Math.abs(height);
		}
		this.cutSize = {left,top,width,height};

		const inputElements = document.querySelectorAll("#cutsize-wrap > input");
		inputElements[0].value = left;
		inputElements[1].value = top;
		inputElements[2].value = width;
		inputElements[3].value = height;
	}
	oninputCutSize(){
		const inputElements = document.querySelectorAll("#cutsize-wrap > input");
		const left   = inputElements[0].value;
		const top    = inputElements[1].value;
		const width  = inputElements[2].value;
		const height = inputElements[3].value;
		this.setCutSize(left,top,width,height);
	}
	calcPosOnCanvas(e){
		const scaleX = VIDEO_WIDTH  / e.target.clientWidth;
		const scaleY = VIDEO_HEIGHT / e.target.clientHeight;
		return [
			scaleX * (e.clientX - e.target.getBoundingClientRect().left),
			scaleY * (e.clientY - e.target.getBoundingClientRect().top )
		];
	}
}

class Main{
	constructor(){
		this.old = new ImageData(SHRINK_WIDTH / 2,SHRINK_HEIGHT);//32F前の右側のデータ
		this.sourceSize = {
			width : parseInt(SHRINK_WIDTH  / 2),
			height: parseInt(SHRINK_HEIGHT / 6),
		};
	}
	measure(adjustedContext){
		
		const closestPixels = [];
		for(let i = 0;i < 6;i++){
			const sourcePos  = {//比較元の左上座標
				x: SHRINK_WIDTH - this.sourceSize.width,//右寄せ
				y: i * this.sourceSize.height
			};
			// const compareStart = Math.round(sourcePos.x - 51.5 * SHRINK_WIDTH / 256);
			// const compareStop  = Math.round(sourcePos.x - 46.5 * SHRINK_WIDTH / 256);
			const compareStart = Math.round(sourcePos.x - 102 * SHRINK_WIDTH / 256);
			const compareStop  = Math.round(sourcePos.x);

			const evals = [];
			const source = new ImageData(this.old.data.slice(4 * this.sourceSize.width * this.sourceSize.height * i,4 * this.sourceSize.width * this.sourceSize.height * (i + 1)),this.sourceSize.width,this.sourceSize.height);
			
			for(let x = compareStart;x <= compareStop;x++){
				const target = adjustedContext.getImageData(x,sourcePos.y,this.sourceSize.width,this.sourceSize.height);	//比較先
				let sumOfPixelDiff = 0;	//画素ごとの色差の和
				for(let i = 0;i < source.data.length;i+=4){
					const pixelDiff = 
						Math.abs(target.data[i] - source.data[i])
					  + Math.abs(target.data[i + 1] - source.data[i + 1])
					  + Math.abs(target.data[i + 2] - source.data[i + 2]);
					sumOfPixelDiff += pixelDiff;
				}
				
				evals.push([x,sumOfPixelDiff]);
			}
			const countSamePixels = () => {	//単色画像との差を調べる
				//左上のピクセル
				const mono = this.old.data.slice(4 * this.sourceSize.width * this.sourceSize.height * i,4 * this.sourceSize.width * this.sourceSize.height * i + 4);
				let samePixels = 0;	//画素値が±5以内のピクセル数
				for(let i = 0;i < source.data.length;i+=4){
					if(Math.abs(mono[0] - source.data[i]    )
					 + Math.abs(mono[1] - source.data[i + 1])
					 + Math.abs(mono[2] - source.data[i + 2]) <= 15){
						samePixels += 1;
					}
				}
				return samePixels;
			};
			evals.sort((a,b) => a[1] - b[1]);
			const speed = (sourcePos.x - evals[0][0]) / (SHRINK_WIDTH / 256);
			const samePixels = countSamePixels();
			
			closestPixels.push({
				pixel: evals[0][0],
				diff: evals[0][1],
				speed,
				samePixels,
			});
		}


		const r = {
			source: this.old,
			target: adjustedContext.getImageData(0,0,SHRINK_WIDTH,SHRINK_HEIGHT),
			closestPixels
		}
		//右半分を保存
		this.old = adjustedContext.getImageData(SHRINK_WIDTH / 2,0,SHRINK_WIDTH / 2,SHRINK_HEIGHT);

		return r;
	}
	
}