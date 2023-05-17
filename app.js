/**
	@type {typeof import('lui/index')}
*/
const lui=window.lui;
const {
	init,
	node,
	node_dom,
	node_map,
	hook_effect,
	hook_memo,
	hook_model,
}=lui;

const model={
	init: ()=>({
		view: "overview",
		account: null,
	}),
	set: (state,key,value)=>({
		...state,
		[key]: value,
	}),
};
const model_play={
	init:()=>({
		allowChangePlayback: false,
		connected: false,
		currentlyPlaying: null,
	}),
	set: (state,key,value)=>({
		...state,
		[key]: value,
	}),
	setCurrentlyPlayingKey: (state,key,value)=>({
		...state,
		currentlyPlaying:{
			...state.currentlyPlaying,
			[key]: value,
		},
	}),
	setCurrentlyPlayingProgress: (state,progress)=>({
		...state,
		currentlyPlaying:{
			...state.currentlyPlaying,
			track:{
				...state.currentlyPlaying.track,
				progress,
			},
		},
	}),
};

function getToken(){
	const cookie=document.cookie.split("; ").find(item=>item.startsWith("token="));
	if(cookie) return cookie.substring(6);
	return null;
}
function timeToStr(ms){
	const numToStr=num=>String(num).padStart(2,"0");
	let sec=Math.floor(ms/1000); // Millisekunden zu Sekunden;

	let min=Math.floor(sec/60);
	sec=sec%60;

	let hou=Math.floor(min/60);
	min=min%60;
	const time=`${hou===0?"":numToStr(hou)+":"}${numToStr(min)}:${numToStr(sec)}`
	return time;
}

function ViewOverview({state,musikPlayer,spotify}){return[
	node_dom("h1[innerText=Übersicht]"),
	node(ViewOverviewMusikPlayer,{state,musikPlayer}),
	node(ViewOverviewSpotify,{state,spotify}),

]}
function ViewOverviewMusikPlayer({state,musikPlayer}){return[
	node_dom("p[innerText=coming later ...]"),
]}
function ViewOverviewSpotify({state,spotify}){return[
	spotify.state.currentlyPlaying===null&&
	node_dom("p[innerText=Keine Wiedergabe auf Spotify][style=color:red]"),

	spotify.state.currentlyPlaying!==null&&
	node_dom("div",null,[
		node_dom("p",null,[
			node_dom("span[innerText=Song: ]"),
			node_dom("a",{
				innerText: spotify.state.currentlyPlaying.track.name,
				href: spotify.state.currentlyPlaying.track.url,
				onclick:()=> confirm(`Weiter auf Spotify?\n${spotify.state.currentlyPlaying.track.name}\n\n${spotify.state.currentlyPlaying.track.url}`)
			})
		]),

		spotify.state.currentlyPlaying.track.imgs.length>2&&
		node_dom("p",null,[
			node_dom("img",{
				src: spotify.state.currentlyPlaying.track.imgs.find(item=>item.height===300&&item.width===300).url,
			}),
		]),

		node_dom("p[style=display:flex;align-items:center]",{
			S:{
				"align-items": "center",
				color: spotify.state.currentlyPlaying.playing?"green":"red",
				display: "flex",
			},
		},[
			node_dom("span",{
				innerText: timeToStr(spotify.state.currentlyPlaying.track.progress),
			}),
			node_dom("input[disabled=true][type=range][style=margin-right:10px;margin-left:10px]",{
				value: spotify.state.currentlyPlaying.track.progress,
				max: spotify.state.currentlyPlaying.track.length,
			}),
			node_dom("span",{
				innerText: timeToStr(spotify.state.currentlyPlaying.track.length),
			}),
		]),

		spotify.state.currentlyPlaying.track.mp3&&
		node_dom("p[style=display:flex;align-items:center]",null,[
			node_dom("span[innerText=Rein hören: ]"),
			node_dom("audio[preload][controls][style=height:20px]",{
				src: spotify.state.currentlyPlaying.track.mp3,
			}),
		]),

		spotify.state.allowChangePlayback&&
		node_dom("div",null,[
			node_dom("p",null,[
				node_dom("button[innerText=<]",{
					onclick:()=>spotify.socket.emit("playbackAction",{action:"previous"}),
				}),
				node_dom("button[innerText=Play]",{
					onclick:()=>spotify.socket.emit("playbackAction",{action:"play"}),
				}),
				node_dom("button[innerText=Pause]",{
					onclick:()=>spotify.socket.emit("playbackAction",{action:"pause"}),
				}),
				node_dom("button[innerText=>]",{
					onclick:()=>spotify.socket.emit("playbackAction",{action:"next"}),
				}),
			]),
			
		]),
	]),
	node_dom("textarea",{
		innerHTML: JSON.stringify(spotify.state.currentlyPlaying,null,2).split("\n").join("&#10;"),
		rows: JSON.stringify(spotify.state.currentlyPlaying,null,2).split("\n").length+2,
		S:{
			width: "100%",
		},
	}),
]}

init(()=>{
	const [state,actions]=hook_model(model);
	const musikPlayer={};
	const spotify={};
	{
		const [state,actions]=hook_model(model_play);
		musikPlayer.state=state;
		musikPlayer.actions=actions;
	}
	{
		const [state,actions]=hook_model(model_play);
		spotify.state=state;
		spotify.actions=actions;
		spotify.socket=hook_memo(()=>io({
			path: "/bind/socket/currently-playing/spotify",
			auth: {
				token: getToken(),
			}
		}));
	}
	
	hook_effect(()=>{
		window.actions=actions;
		{
			// MUSIKPLAYER //
			// create global variables
			window.musikPlayer={};
			window.musikPlayer.actions=musikPlayer.actions;
		}
		{
			// SPOTIFY //
			// create global variables
			window.spotify={};
			window.spotify.actions=spotify.actions;
			window.spotify.socket=spotify.socket;

			// create socket events
			spotify.socket.on("init",data=>{
				const {
					account,
					allowChangePlayback,
				}=data;
				console.log("account",account);
				actions.set("account",account);
				console.log("allowChangePlayback",allowChangePlayback);
				spotify.actions.set("allowChangePlayback",allowChangePlayback);
			});
			spotify.socket.on("set-infos",currentlyPlaying=>{
				console.log("currentlyPlaying",currentlyPlaying);
				spotify.actions.set("currentlyPlaying",currentlyPlaying);
			});
			spotify.socket.emit("get-infos");
			spotify.socket.on("change-device",device=>spotify.actions.setCurrentlyPlayingKey("device",device));
			spotify.socket.on("change-playing",playing=>spotify.actions.setCurrentlyPlayingKey("playing",playing));
			spotify.socket.on("change-progress",progress=>spotify.actions.setCurrentlyPlayingProgress(progress));
			spotify.socket.on("change-track",track=>spotify.actions.setCurrentlyPlayingKey("track",track));
			spotify.socket.onAny(console.log);
		}

	});

	return[null,[
		state.view==="overview"&&
		node(ViewOverview,{state,musikPlayer,spotify}),
	]];
})