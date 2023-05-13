function callApi(data){
	const {args}=data;
	fetch("/server/spotify/spotify.api",{
		method:"post",
		headers:{"Content-Type":"application/json"},
		credentials:"include",
		body:JSON.stringify(args),
	})
		.then(res=>res.text())
		.then(res=>HandleServerResponse({
			serverResponse: JSON.parse(res),
			clientAction: args.want,
			clientRequest: data,
		}))
}
function HandleServerResponse(data){
	const {
		serverResponse,
		clientAction,
		clientRequest,
	}=data;
	if(serverResponse.code=="ok"){
		if(clientAction=="next"||clientAction=="previous"){
			console.log("Play "+clientAction+" Song!");
		}
		else if(clientAction=="getPlayback"){
			const track_name=document.getElementById("track_name");
			const device_name=document.getElementById("device_name");
			const select_imgSize=document.getElementById("select_imgSize");
			const track_cover=document.getElementById("track_cover");
			const div_noPlayback=document.getElementById("div_noPlayback");
			const div_playback=document.getElementById("div_playback");

			if(serverResponse.data.infos){
				const {track,device}=serverResponse.data.infos;

				track_name.innerText=track.name;
				device_name.innerText=device.name+` (${device.type}), ${device.volume}%`;
				select_imgSize.disabled=false;

				track_cover.imgs={
					"640x640": track.imgs[0].url,
					"300x300": track.imgs[1].url,
					"64x64": track.imgs[2].url,
				};
				changeImg(select_imgSize.value,track_cover);

				div_noPlayback.className="hidden";
				div_playback.className="";
			}else{
				track_name.innerText="...";
				device_name.innerText="...";
				select_imgSize.disabled=true;
				//select_imgSize.value="300x300";
				track_cover.src="/files/img/gif/busyGOLD.gif";
				track_cover.imgs={};
				div_noPlayback.className="";
				div_playback.className="hidden";
			}
		}
	}
	else if(serverResponse.errormsg){
		alert("Server:\n"+serverResponse.errormsg);
	}
}
function changeImg(img,imgElement){
	if(typeof(imgElement)=="string"){imgElement=document.getElementById(imgElement)}// String to Element

	const url=imgElement.imgs[img];
	imgElement.src=url;
}

setInterval(()=>{
	callApi({args:{want:"getPlayback"}});
},5e3);

callApi({args:{want:"getPlayback"}});
