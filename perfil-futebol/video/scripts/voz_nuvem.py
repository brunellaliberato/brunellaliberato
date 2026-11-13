import sys, time, torch, soundfile as sf
from omnivoice import OmniVoice
torch.set_num_threads(4)
ref, ref_text, text, out, speed = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5])
t=time.time()
m = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cpu", dtype=torch.float32)
print("load", round(time.time()-t,1), flush=True)
t=time.time()
audio = m.generate(text=text, language="pt", ref_audio=ref, ref_text=ref_text, speed=speed, num_step=32, denoise=True)
a = audio[0] if isinstance(audio, list) else audio
a = a.squeeze().cpu().numpy() if hasattr(a, "cpu") else a
sf.write(out, a, m.sampling_rate)
print("gen", round(time.time()-t,1), "sr", m.sampling_rate, flush=True)
