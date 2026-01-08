import  { useState } from "react";
import { ReactMic } from "react-mic";

function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const onStop = (recordedBlob) => {
    console.log("Recorded blob:", recordedBlob);
    setAudioBlob(recordedBlob.blob);
  };

  return (
    <div>
      <ReactMic
        record={isRecording}
        onStop={onStop}
        strokeColor="#000000"
        backgroundColor="#FF4081"
      />

      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>

      {audioBlob && (
        <audio controls src={URL.createObjectURL(audioBlob)} />
      )}
    </div>
  );
}

export default VoiceRecorder;
