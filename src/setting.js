class Setting{
	constructor(){
		this.fullCanvas = document.querySelector("#canvas-full");
		this.fullContext = this.fullCanvas.getContext("2d");
		this.adjustedCanvas = document.querySelector("#canvas-adjusted-setting");
		this.adjustedContext = this.adjustedCanvas.getContext("2d");

		this.screenRect = [0,0,0,0];

		this.isDragging = false;
		this.dragBeginPos = [0,0];
		this.dragEndPos = [0,0];

		this.isOpen = false;

		this.fullCanvas.addEventListener("mousedown",e => {
			this.isDragging = true;
			this.dragBeginPos = this.calcPosOnCanvas(e);
		});
		this.fullCanvas.addEventListener("mousemove",e => {
			this.dragEndPos = this.calcPosOnCanvas(e);
		});
		this.fullCanvas.addEventListener("mouseup",e => {
			this.isDragging = false;
			this.dragEndPos = this.calcPosOnCanvas(e);
			const [x,y,w,h] = this.calcRectFromPos(...this.dragBeginPos,...this.dragEndPos);
			this.adjust(x,y,w,h);
		});
		
		this.fullContext.fillStyle = "rgba(232,133,130,0.8)";
	}
	process(video){
		this.fullContext.drawImage(video,0,0,INPUT_WIDTH,INPUT_HEIGHT);
		if(this.isDragging){
			const [x,y,w,h] = this.calcRectFromPos(...this.dragBeginPos,...this.dragEndPos);
			this.fullContext.fillRect(x,y,w,h)
		}
		this.adjustedContext.drawImage(video,...this.screenRect,0,0,OUTPUT_WIDTH,OUTPUT_HEIGHT);
	}
	open(video){
		const v = video;
		this.isOpen = true;
		let loop = () => {
			if(!this.isOpen) return;
			this.process(v);
			setTimeout(loop,16 - Date.now() % 16);
		};
		loop();
	}
	close(){
		this.isOpen = false;
	}
	calcPosOnCanvas(e){
		const scaleX = INPUT_WIDTH  / e.target.clientWidth;
		const scaleY = INPUT_HEIGHT / e.target.clientHeight;
		return [
			scaleX * (e.clientX - e.target.getBoundingClientRect().left),
			scaleY * (e.clientY - e.target.getBoundingClientRect().top )
		];
	}

	calcRectFromPos(x1,y1,x2,y2){
		const x = parseInt(Math.min(x1,x2));
		const y = parseInt(Math.min(y1,y2));
		const w = parseInt(Math.abs(x2 - x1)) + 1;
		const h = parseInt(Math.abs(y2 - y1)) + 1;
		return [x,y,w,h];
	}

	adjust(x,y,w,h){
		const input = document.querySelectorAll("#size-input-wrap > input");
		const fit = (n,min,max) => {
			return Math.min(Math.max(n,min),max);
		};
		input[0].value = fit(x,0,INPUT_WIDTH);
		input[1].value = fit(y,0,INPUT_HEIGHT);
		input[2].value = fit(w,1,INPUT_WIDTH);
		input[3].value = fit(h,1,INPUT_HEIGHT);
		this.screenRect = [x,y,w,h];
	}
	onInput(){ 
		const input = document.querySelectorAll("#size-input-wrap > input");
		const x = input[0].value;
		const y = input[1].value;
		const w = input[2].value;
		const h = input[3].value;
		this.adjust(x,y,w,h);
	}
}