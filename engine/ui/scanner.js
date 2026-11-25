// Browser-native QR scanner: camera permission is requested only on user action.
export function openCameraScanner(video,{onCode,onError}){
 let stream=null,detector=null,stopped=false,frame=0,busy=false,started=false;
 function stop(){stopped=true;if(frame)cancelAnimationFrame(frame);if(stream)for(const track of stream.getTracks())track.stop();stream=null;video.srcObject=null;}
 async function scan(){
  if(stopped)return;
  if(!busy&&video.readyState>=2){
   busy=true;
   try{const codes=await detector.detect(video);if(!stopped&&codes.length){stop();onCode(codes[0].rawValue);return;}}
   catch(e){if(!stopped){stop();onError("Could not read camera frames. Try entering the printed code.");return;}}
   finally{busy=false;}
  }
  if(!stopped)frame=requestAnimationFrame(scan);
 }
 async function start(){
  if(started)return;started=true;
  if(!navigator.mediaDevices?.getUserMedia)throw Error("Camera access is unavailable. Use the printed discovery code.");
  if(!("BarcodeDetector" in globalThis))throw Error("QR scanning is not supported by this browser. Use the printed discovery code.");
  try{detector=new BarcodeDetector({formats:["qr_code"]});}
  catch{throw Error("QR scanning is unavailable. Use the printed discovery code.");}
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"}}});
   if(stopped){for(const track of stream.getTracks())track.stop();return;}
   video.srcObject=stream;await video.play();if(!stopped)scan();
  }catch(error){stop();if(error.name==="NotAllowedError")throw Error("Camera permission was denied. Allow camera access or enter the printed code.");throw Error("Camera could not start. Use the printed discovery code.");}
 }
 return {start,stop};
}
