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
		view: location.hash?location.hash.substring(1):"overview",
		account: null,
	}),
	set: (state,key,value)=>({
		...state,
		[key]: value,
	}),
};
const model_musikPlayer={
	init:()=>({
		allowChangePlayback: false,
		connected: false,
		currentlyPlaying: null,
		init: false,
		selected_album: "$all",
		selected_track: null,
		tracks: [],
		volume: 50,
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
};
const model_spotify={
	init:()=>({
		allowChangePlayback: false,
		connected: false,
		currentlyPlaying: null,
		devices: [],
		init: false,
		playlists: [],
		tracks: [],
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
	setCurrentlyPlayingDeviceVolume: (state,volume)=>({
		...state,
		currentlyPlaying:{
			...state.currentlyPlaying,
			device:{
				...state.currentlyPlaying.device,
				volume,
			},
		},
	}),
	setPlaylist: (state,id,playlist)=>({
		...state,
		playlists: [
			...state.playlists.filter(item=>item.id!==id),
			playlist,
		],
	}),
	setTrack: (state,id,track)=>({
		...state,
		tracks: [
			...state.tracks.filter(item=>item.id!==id),
			track,
		],
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

	node_dom("p",null,[
		node_dom("a[innerText=Musik Player][href=#musikPlayer]"),
		node_dom("span[innerText=: ]"),
		node_dom("b",{
			innerText: musikPlayer.state.currentlyPlaying?musikPlayer.state.currentlyPlaying.track.name:"Keine Wiedergabe",
		}),
	]),
	node_dom("p",null,[
		node_dom("a[innerText=Spotify][href=#spotify]"),
		node_dom("span[innerText=: ]"),
		node_dom("b",{
			innerText: spotify.state.currentlyPlaying?spotify.state.currentlyPlaying.track.name:"Keine Wiedergabe",
		}),
	]),

]}
function ViewMusikPlayer({musikPlayer}){return[
	node_dom("h1[innerHTML=Wiedergabe auf <u style=color:green>Musik Player</u>][style=cursor:pointer]",{
		onclick:()=>{
			actions.set("view","overview");
			history.replaceState(null,"Wiedergabe","/currently-playing");
		},
	}),

	musikPlayer.state.currentlyPlaying===null&&
	node_dom("p[innerText=Keine Wiedergabe][style=color:red]"),

	musikPlayer.state.currentlyPlaying&&
	node_dom("div",null,[
		node_dom("p",null,[
			node_dom("span[innerText=Song: ]"),
			node_dom("b",{
				innerText: musikPlayer.state.currentlyPlaying.track.name,
				S:{ color: musikPlayer.state.currentlyPlaying.isPlaying?"":"red"},
				title: musikPlayer.state.currentlyPlaying.track.src,
			}),
		]),
		musikPlayer.state.currentlyPlaying.track.trackNumber&&
		node_dom("p",null,[
			node_dom("span[innerText=Title Nummer: ]"),
			node_dom("b",{
				innerText: musikPlayer.state.currentlyPlaying.track.trackNumber,
			}),
		]),
		musikPlayer.state.currentlyPlaying.track.album&&
		node_dom("p",null,[
			node_dom("span[innerText=Album: ]"),
			node_dom("b",{
				innerText: musikPlayer.state.currentlyPlaying.track.album,
			}),
		]),
		musikPlayer.state.currentlyPlaying.track.discNumber&&
		node_dom("p",null,[
			node_dom("span[innerText=CD: ]"),
			node_dom("b",{
				innerText: musikPlayer.state.currentlyPlaying.track.discNumber,
			}),
		]),
		musikPlayer.state.allowChangePlayback&&
		node_dom("div",null,[
			node_dom("p",null,[
				node_dom("label[innerText=Album: ]"),
				node_dom("select",{
					onchange: event=> musikPlayer.actions.set("selected_album",event.target.value==="null"?null:event.target.value),
				},[
					node_map(
						Album,
						[
							"$all",
							...Array.from(new Set(musikPlayer.state.tracks.map(item=>item.album?item.album:""))),
						],
						{
							musikPlayer,
							select: musikPlayer.state.selected_album===null?"":musikPlayer.state.selected_album,
						}
					),
				]),
				node_dom("button[innerText=Abspielen][style=margin-left:5px]",{
					onclick:()=>{
						const tracks=musikPlayer.state.tracks.filter(item=>item.album===musikPlayer.state.selected_album);
						const track=tracks.find(item=>item.trackNumber===1);
						if(musikPlayer.state.selected_album==="$all"){
							musikPlayer.socket.emit("set-playback",0);
							return;
						}

						if(track){
							musikPlayer.socket.emit("set-playback",track.index);
						}else{
							musikPlayer.socket.emit("set-playback",tracks[0]);
						}
					},
				}),
			]),
			node_dom("ul",null,[
				node_map(
					Track,
					musikPlayer.state.tracks.filter(item=>
						item.album===musikPlayer.state.selected_album||
						musikPlayer.state.selected_album==="$all"
					),
					{musikPlayer}
				),
			]),
		]),
	]),
]}
function Album({I,select,musikPlayer}){return[
	node_dom("option",{
		innerText: !I?"-- Ohne --":(I!=="$all"?I:"-- Alle --"),
		value: !I?"null":(I!=="$all"?I:"$all"),
		selected: I===select,
	}),
]}
function Track({I,musikPlayer}){return[
	node_dom("li",null,[
		node_dom("a[href=#about:blank]",{
			innerText: I.name,
			onclick: event=>{
				event.preventDefault();
				musikPlayer.socket.emit("set-playback",I.index)
			},
		}),
	]),
]}
function ViewSpotify({state,spotify,musikPlayer}){return[
	node_dom("h1[innerHTML=Wiedergabe auf <u style=color:green>Spotify</u>][style=cursor:pointer]",{
		onclick:()=>{
			actions.set("view","overview");
			history.replaceState(null,"Wiedergabe","/currently-playing");
		},
	}),

	spotify.state.currentlyPlaying===null&&
	node_dom("p[innerText=Keine Wiedergabe][style=color:red]"),

	spotify.state.currentlyPlaying!==null&&
	spotify.state.currentlyPlaying.track&&
	node_dom("div",null,[
		node_dom("p",null,[
			node_dom("span[innerText=Song: ]"),
			node_dom("a",{
				href: spotify.state.currentlyPlaying.track.url,
				innerText: spotify.state.currentlyPlaying.track.name,
				onclick:()=> confirm(`Weiter auf Spotify?\n${spotify.state.currentlyPlaying.track.name}\n\n${spotify.state.currentlyPlaying.track.url}`),
				target: "_blank",
			}),
		]),

		spotify.state.currentlyPlaying.device&&
		spotify.state.currentlyPlaying.device.active&&
		node_dom("p",null,[
			node_dom("span[innerText=Gerät: ]"),
			node_dom("span",{
				innerText: spotify.state.currentlyPlaying.device.name+" ("+spotify.state.currentlyPlaying.device.volume+"%)"
			}),
		]),
		spotify.state.currentlyPlaying.device&&
		["Zimmer","Server","Lando","Musik","Box"].some(item=>spotify.state.currentlyPlaying.device.name.includes(item))&&
		node_dom("p",null,[
			node_dom("span[innerText=Zimmer/Musik-Box/Server Lautstärke: ]"),
			node_dom("b",{
				innerText: musikPlayer.state.volume+"%",
			}),
		]),

		spotify.state.currentlyPlaying.source&&
		spotify.state.currentlyPlaying.source.type==="playlist"&&
		spotify.state.playlists.find(item=>item.id===spotify.state.currentlyPlaying.source.id)&&
		node_dom("p",null,[
			node_dom("a[innerText=Playlist]",{
				href: "#spotify-playlist-"+spotify.state.currentlyPlaying.source.id,
			}),
			node_dom("span[innerText=: ]"),
			node_dom("a",{
				href: spotify.state.playlists.find(item=>item.id===spotify.state.currentlyPlaying.source.id).url,
				innerText: spotify.state.playlists.find(item=>item.id===spotify.state.currentlyPlaying.source.id).name,
				onclick:()=> confirm(`Weiter auf Spotify?\n${spotify.state.playlists.find(item=>item.id===spotify.state.currentlyPlaying.source.id).name} von ${spotify.state.playlists.find(item=>item.id===spotify.state.currentlyPlaying.source.id).ownerName}\n\n${spotify.state.playlists.find(item=>item.id===spotify.state.currentlyPlaying.source.id).url}`),
				target: "_blank",
			}),
		]),

		spotify.state.currentlyPlaying.track.imgs&&
		spotify.state.currentlyPlaying.track.imgs.find(item=>item.height===300&&item.width===300)!==-1&&
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
				innerText: timeToStr(spotify.state.currentlyPlaying.progress),
			}),
			node_dom("input[type=range][style=margin-right:10px;margin-left:10px]",{
				value: spotify.state.currentlyPlaying.progress,
				max: spotify.state.currentlyPlaying.track.length,
				disabled: !spotify.state.allowChangePlayback,
				oninput: event=> {
					const position=event.target.value;
					spotify.socket.emit("set-position",position);
					spotify.actions.setCurrentlyPlayingKey("progress",position);
				},
			}),
			node_dom("span",{
				innerText: timeToStr(spotify.state.currentlyPlaying.track.length),
			}),
		]),

		spotify.state.currentlyPlaying.track.mp3&&
		node_dom("p[style=display:flex;align-items:center]",null,[
			node_dom("span[innerText=Rein hören: ]"),
			node_dom("audio[preload=off][controls][style=height:20px]",{
				src: spotify.state.currentlyPlaying.track.mp3,
			}),
		]),

		spotify.state.allowChangePlayback&&
		node_dom("div",null,[
			spotify.state.currentlyPlaying&&
			spotify.state.currentlyPlaying.device.volumeSupport&&
			node_dom("p[style=display:flex;align-items:center]",null,[
				node_dom("span[innerText=Geräte Lautstärke: ]"),
				node_dom("input[type=range][max=100][style=margin-right:10px;margin-left:10px]",{
					value: spotify.state.currentlyPlaying.device.volume,
					oninput: event=> {
						const volume=event.target.value;
						spotify.socket.emit("set-volume",volume);
						spotify.actions.setCurrentlyPlayingDeviceVolume(volume);
					},
				}),
				node_dom("b",{
					innerText: spotify.state.currentlyPlaying.device.volume+"%",
				}),
			]),

			node_dom("p[style=display:flex;align-items:center]",null,[
				node_dom("span[innerText=Server Lautstärke: ]"),
				node_dom("input[type=range][max=100][style=margin-right:10px;margin-left:10px]",{
					value: musikPlayer.state.volume,
					oninput: event=> {
						const volume=event.target.value;
						musikPlayer.socket.emit("set-volume",volume);
						musikPlayer.actions.set("volume",volume);
					},
				}),
				node_dom("b",{
					innerText: musikPlayer.state.volume+"%",
				}),
			]),
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
]}
function ViewSpotifyPlaylist({spotify,playlist}){
	return[
		node_dom("h1",{
			innerText: "Playlist",
		}),
		node_dom("p[innerText=Name: ]",null,[
			node_dom("span",{
				innerText: playlist.name,
			}),
		]),
		playlist.description&&
		node_dom("p[innerText=Beschreibung: ]",null,[
			node_dom("span",{
				innerText: playlist.description,
			}),
		]),

		node_map(SpotifyPlaylistTrack,playlist.items,{spotify,playlist}),
	];
}
function SpotifyPlaylistTrack({I,spotify,playlist}){
	const track=spotify.state.tracks.find(item=>item.id===I.id);
	if(!track) spotify.socket.emit("get-track",I.id);
	return[
		!track&&
		node_dom("p[innerText=Lade Song-Infos zu ]",null,[
			node_dom("code",{innerText: I.id}),
		]),
		track&&
		node_dom("p[style=display:flex;align-items:center]",null,[
			track.imgs.find(item=>item.width===64&&item.height===64)&&
			node_dom("img",{
				src: track.imgs.find(item=>item.width===64&&item.height===64).url,
			}),
			node_dom("span",null,[
				node_dom("a",{
					href: track.url,
					innerText: track.name,
					onclick:()=> confirm(`Weiter auf Spotify?\n${track.name}\n\n${track.url}`),
					target: "_blank",
				}),
				node_dom("br"),

				spotify.state.currentlyPlaying&&
				spotify.state.currentlyPlaying.track&&
				spotify.state.currentlyPlaying.track.id===track.id&&
				node_dom("span[innerText=Wird Abgespielt][style=color:green]"),

				spotify.state.currentlyPlaying&&
				spotify.state.currentlyPlaying.track&&
				spotify.state.currentlyPlaying.track.id===track.id&&
				node_dom("span[innerText=, ]"),

				spotify.state.allowChangePlayback&&
				node_dom("button[innerText=Abspielen]",{
					onclick: ()=>{
						const body={
							action: "play",
							context: "spotify:playlist:"+playlist.id,
							offset: playlist.items.findIndex(item=>item.id===I.id),
						}
						console.log(body);
						spotify.socket.emit("playbackAction",body);
					},
				}),
			]),
		]),
	];
}

init(()=>{
	const [state,actions]=hook_model(model);
	const musikPlayer={};
	const spotify={};
	{
		const [state,actions]=hook_model(model_musikPlayer);
		musikPlayer.state=state;
		musikPlayer.actions=actions;
		musikPlayer.socket=hook_memo(()=>io({
			path: "/bind/socket/currently-playing/musikPlayer",
			auth: {
				token: getToken(),
			}
		}));
	}
	{
		const [state,actions]=hook_model(model_spotify);
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
			window.musikPlayer.socket=musikPlayer.socket;

			// create socket events
			musikPlayer.socket.onAny(console.log);
			musikPlayer.socket.once("init",data=>{
				const {
					account,
					allowChangePlayback,
					currentlyPlaying,
					tracks,
					volume,
				}=data;
				actions.set("account",account);
				musikPlayer.actions.set("allowChangePlayback",allowChangePlayback);
				musikPlayer.actions.set("currentlyPlaying",currentlyPlaying);
				musikPlayer.actions.set("init",true);
				musikPlayer.actions.set("tracks",tracks);
				musikPlayer.actions.set("volume",volume);
			});
			musikPlayer.socket.on("change-volume",volume=>musikPlayer.actions.set("volume",volume));
			musikPlayer.socket.on("currentlyPlaying",currentlyPlaying=> musikPlayer.actions.set("currentlyPlaying",currentlyPlaying));
		}
		{
			// SPOTIFY //
			// create global variables
			window.spotify={};
			window.spotify.actions=spotify.actions;
			window.spotify.socket=spotify.socket;

			// create socket events
			spotify.socket.once("init",data=>{
				const {
					account,
					allowChangePlayback,
					currentlyPlaying,
				}=data;
				actions.set("account",account);
				spotify.actions.set("allowChangePlayback",allowChangePlayback);
				spotify.actions.set("currentlyPlaying",currentlyPlaying);
				spotify.actions.set("init",true);
			});
			spotify.socket.on("change-device",device=>spotify.actions.setCurrentlyPlayingKey("device",device));
			spotify.socket.on("change-playing",playing=>spotify.actions.setCurrentlyPlayingKey("playing",playing));
			spotify.socket.on("change-progress",progress=>spotify.actions.setCurrentlyPlayingKey("progress",progress));
			spotify.socket.on("change-source",source=>spotify.actions.setCurrentlyPlayingKey("source",source));
			spotify.socket.on("change-track",track=>spotify.actions.setCurrentlyPlayingKey("track",track));
			spotify.socket.on("change-volume",spotify.actions.setCurrentlyPlayingDeviceVolume);
			spotify.socket.on("set-infos",currentlyPlaying=>spotify.actions.set("currentlyPlaying",currentlyPlaying));
			spotify.socket.on("set-playlist",spotify.actions.setPlaylist);
			spotify.socket.on("set-track",spotify.actions.setTrack);
			spotify.socket.onAny(console.log); // good for debugging :)

			spotify.socket.emit("get-infos");
		}

	});
	hook_effect(sourceId=>{
		if(!sourceId) return;

		const source=spotify.state.currentlyPlaying.source;
		if(source.type==="playlist"){
			if(spotify.state.playlists.find(item=>item.id===sourceId)) return;
			console.log("local-want change-source",sourceId);
			spotify.socket.emit("get-playlist",sourceId);
		}
	},[spotify.state.currentlyPlaying&&spotify.state.currentlyPlaying.source?spotify.state.currentlyPlaying.source.id:null]);

	return[{
		onhashchange:()=> actions.set("view",location.hash?location.hash.substring(1):"overview"),
	},[
		
		state.view==="overview"&&
		node(ViewOverview,{state,musikPlayer,spotify}),

		musikPlayer.state.init&&
		state.view==="musikPlayer"&&
		node(ViewMusikPlayer,{state,musikPlayer}),

		spotify.state.init&&
		state.view==="spotify"&&
		node(ViewSpotify,{state,spotify,musikPlayer}),

		spotify.state.init&&
		state.view.startsWith("spotify-playlist-")&&
		spotify.state.playlists.find(item=>item.id===state.view.substring(17))&&
		node(ViewSpotifyPlaylist,{
			state, spotify,
			playlist: spotify.state.playlists.find(item=>item.id===state.view.substring(17)),
		}),

		spotify.state.init&&
		state.view.startsWith("spotify-playlist-")&&
		!spotify.state.playlists.find(item=>item.id===state.view.substring(17))&&
		node_dom("p[innerText=Spotify-Playlist nicht gefunden... sorry]"),
	]];
})