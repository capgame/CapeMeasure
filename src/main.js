const INPUT_WIDTH  = 1920;
const INPUT_HEIGHT = 1080;

const OUTPUT_WIDTH = 256;
const OUTPUT_HEIGHT = 224;

let app;


window.onload = function(){
	app = new App();
	app.setting.adjust(35,21,1200,898);
	// app.setting.adjust(0,0,871,672);

	let settingButton = document.querySelector("#setting-button");
	settingButton.addEventListener("click",() => {
		if(app.setting.isOpen){
			app.setting.close();
			document.querySelector("#setting").style.display = "none";
		}else{
			app.setting.open(app.video);
			document.querySelector("#setting").style.display = "block";
		}
	});
	// let startButton = document.querySelector("#start-button");
	// startButton.addEventListener("click",() => {
	// 	app.loadVideo();
	// });
	// let stopButton = document.querySelector("#stop-button");
	// stopButton.addEventListener("click",() => {
	// 	app.stream.getTracks()[0].stop();
	// });
};

class App{
	constructor(){
		this.main = new Main();
		this.setting = new Setting();
		this.currentTab = "main";	//"config" | "main"

		this.video = document.querySelector("#video");
		this.stream = null;

		this.adjustedCanvas = document.querySelector("#canvas-adjusted-main");
		this.adjustedContext = this.adjustedCanvas.getContext("2d",{willReadFrequently: true});
		this.infoCanvas = document.querySelector("#canvas-info");
		this.infoContext = this.infoCanvas.getContext("2d");

		this.infoContext.strokeStyle = "#ff0000";
		this.infoContext.lineWidth = 2;
		this.infoContext.font = "30px 'Kosugi Maru'"

		this.history = [];
		this.se = new Audio('assets/warning.mp3');
		this.se.volume = 0.3;

		this.init();
	}
	init(){
		this.loadVideo();
		let loop = () => {
			this.process();
			setTimeout(loop,533 - Date.now() % 533);
		};
		loop();
	}
	loadVideo(){
		navigator.mediaDevices
			.getUserMedia({
				video: true,
				audio: false,
			})
			.then((stream) => {
				this.stream = stream;
				this.video.srcObject = stream;
				this.video.play();
			}).catch(e => console.log(e));
	}
	process(){
		this.adjustedContext.drawImage(this.video,...this.setting.screenRect,0,0,OUTPUT_WIDTH,OUTPUT_HEIGHT);
		const info = this.main.measure(this.adjustedContext);
		const c = this.infoContext;
		const sourceSize = this.main.sourceSize;

		c.clearRect(0,0,1100,480)
		c.putImageData(info.target,0,0);
		c.putImageData(info.source,OUTPUT_WIDTH + 20,0);
		
		for(let i = 1;i < 6;i++){	//枠線
			c.fillRect(0,sourceSize.height * i,1100,2);
		}
		c.fillText("SPEED",OUTPUT_WIDTH + sourceSize.width + 30,32);

		let reliableSpeeds = [];

		for(let i = 1;i < 6;i++){
			c.strokeRect(info.closestPixels[i].mostSimilarPos,sourceSize.height * i + 1,sourceSize.width,sourceSize.height);

			const match = parseInt(info.closestPixels[i].similarity * 100);
			const mono = parseInt(info.closestPixels[i].monochromaticity * 100);
			const speed = info.closestPixels[i].expectedSpeed;
			if(match < 90){
				c.fillStyle = "#cccccc"
				c.fillText(speed + "(s)",OUTPUT_WIDTH + sourceSize.width + 25,sourceSize.height * i + 32);
				c.fillStyle = "#000000"
			}else if(mono > 95){
				c.fillStyle = "#cccccc"
				c.fillText(speed + "(m)",OUTPUT_WIDTH + sourceSize.width + 25,sourceSize.height * i + 32);
				c.fillStyle = "#000000"
			}else{
				c.fillText(speed,OUTPUT_WIDTH + sourceSize.width + 25,sourceSize.height * i + 32);
				reliableSpeeds.push(speed);
			}
		}
		
		const getMode = (array) => {
			const s = new Set(array);
			let c = [];
			for(const i of s){
				const n = array.filter(v => v === i).length;
				c.push([i,n]);
			}
			c = c.sort((a,b) => b[1] - a[1]);
			if(c[0] == null || c[0][1] <= 1)
				return -1;
			return c[0][0];
		}
		const speed = getMode(reliableSpeeds);
		if(speed === -1){
			document.querySelector("#answer").innerText = "推定速度: -";
		}else{
			if(this.history.length > 10){
				this.history.pop(speed);
			}
			
			this.history.unshift(speed);
			if(this.history[0] === 50 && this.history[1] === 50 && this.history[2] === 50 && this.history[3] !== 50){
				console.log("3連続50");
				if(document.querySelector("#se-input").checked){
					this.se.currentTime = 0;
					this.se.play();
				}
			}
			document.querySelector("#answer").innerText = "推定速度: " + speed;
			
		}
	}
}

class Main{
	constructor(){
		this.old = new ImageData(OUTPUT_WIDTH / 2,OUTPUT_HEIGHT);//32F前の右側のデータ
		this.sourceSize = {
			width : parseInt(OUTPUT_WIDTH  / 2),
			height: parseInt(OUTPUT_HEIGHT / 6),
			pixelNumber: parseInt(OUTPUT_WIDTH  / 2) * parseInt(OUTPUT_HEIGHT / 6),
		};
	}
	measure(adjustedContext){
		const closestPixels = [{}];
		for(let i = 1;i < 6;i++){
			const sourcePos  = {//比較元の左上座標
				x: OUTPUT_WIDTH - this.sourceSize.width,//右寄せ
				y: i * this.sourceSize.height
			};
			// const compareStart = Math.round(sourcePos.x - 51 * OUTPUT_WIDTH / 256);
			// const compareStop  = Math.round(sourcePos.x - 46 * OUTPUT_WIDTH / 256);
			const compareStart = Math.round(sourcePos.x - 128 * OUTPUT_WIDTH / 256);
			const compareStop  = Math.round(sourcePos.x);

			const evals = [];
			const source = new ImageData(this.old.data.slice(4 * this.sourceSize.width * this.sourceSize.height * i,4 * this.sourceSize.width * this.sourceSize.height * (i + 1)),this.sourceSize.width,this.sourceSize.height);
			
			for(let x = compareStart;x <= compareStop;x++){
				const target = adjustedContext.getImageData(x,sourcePos.y,this.sourceSize.width,this.sourceSize.height);	//比較先
				let matchedPixels = 0;	//一致したピクセルの数
				for(let i = 0;i < source.data.length;i+=4){
					const colorDiff = 
						Math.abs(target.data[i] - source.data[i])
					  + Math.abs(target.data[i + 1] - source.data[i + 1])
					  + Math.abs(target.data[i + 2] - source.data[i + 2]);
					if(colorDiff < 15){	//画素値の差が15以下
						matchedPixels += 1;
					}
				}
				
				evals.push([x,matchedPixels]);
			}
			const countSameColorPixels = () => {	//単色画像との差を調べる
				//比較対象: 左上のピクセル
				const mono = this.old.data.slice(4 * this.sourceSize.width * this.sourceSize.height * i,4 * this.sourceSize.width * this.sourceSize.height * i + 4);
				let samePixels = 0;
				for(let i = 0;i < source.data.length;i+=4){
					const colorDiff =
						  Math.abs(mono[0] - source.data[i])
						+ Math.abs(mono[1] - source.data[i + 1])
						+ Math.abs(mono[2] - source.data[i + 2]);

					if(colorDiff <= 15){
						samePixels += 1;
					}
				}
				return samePixels;
			};
			evals.sort((a,b) => b[1] - a[1]);	//降順に並べる
			const expectedSpeed = (sourcePos.x - evals[0][0]) / (OUTPUT_WIDTH / 256);
			const similarity = evals[0][1] / this.sourceSize.pixelNumber;
			const monochromaticity = countSameColorPixels() / this.sourceSize.pixelNumber;

			closestPixels.push({
				mostSimilarPos: evals[0][0],
				expectedSpeed,
				similarity,
				monochromaticity,	//単色率
			});
		}


		const r = {
			source: this.old,
			target: adjustedContext.getImageData(0,0,OUTPUT_WIDTH,OUTPUT_HEIGHT),
			closestPixels
		}
		//右半分を保存
		this.old = adjustedContext.getImageData(OUTPUT_WIDTH / 2,0,OUTPUT_WIDTH / 2,OUTPUT_HEIGHT);

		return r;
	}
}