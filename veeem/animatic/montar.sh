#!/bin/bash
# Monta o animatic do Veeem (16:9, 1920x1080) a partir das imagens do PDF, cartelas e voz.
# Uso: bash montar.sh   (de dentro da pasta animatic)
set -euo pipefail
cd "$(dirname "$0")"
T=tmp; mkdir -p $T
FPS=30

# cena | imagem-base (composta em tmp/sN.jpg) | duração
# 1) Renata
cp img/renata-fan.jpg $T/s1.jpg
# 2) Preço
ffmpeg -loglevel error -y -i img/p48.jpg -i cartelas/c2.png -filter_complex "[0][1]overlay" $T/s2.jpg
# 3) Mercado (ícones do PDF ampliados) + passo 1
ffmpeg -loglevel error -y -i img/p22.jpg -i cartelas/c3.png -filter_complex \
  "[0]crop=1440:810:0:180,scale=1920:1080[b];[b][1]overlay" $T/s3.jpg
# 4 e 5) Telas do app sobre fundo laranja + passos 2 e 3
ffmpeg -loglevel error -y -i img/p48.jpg -frames:v 1 -vf "crop=640:360:0:0,scale=1920:1080,boxblur=20" $T/fundo.jpg
ffmpeg -loglevel error -y -i $T/fundo.jpg -i img/p35.jpg -i cartelas/c4.png -filter_complex \
  "[1]crop=540:1080:90:0,scale=-2:1000[f];[0][f]overlay=260:40[a];[a][2]overlay" $T/s4.jpg
ffmpeg -loglevel error -y -i $T/fundo.jpg -i img/p35.jpg -i cartelas/c5.png -filter_complex \
  "[1]crop=540:1080:1310:0,scale=-2:1000[f];[0][f]overlay=260:40[a];[a][2]overlay" $T/s5.jpg
# 6) Prêmio
cp img/p44.jpg $T/s6.jpg
# 7) Fechamento com QR + texto legal
ffmpeg -loglevel error -y -i img/p47.jpg -i cartelas/c7.png -filter_complex "[0][1]overlay" $T/s7.jpg

DUR=(3.6 6.4 5.9 2.75 2.9 4.95 4.6)
: > $T/lista.txt
for i in 1 2 3 4 5 6 7; do
  d=${DUR[$((i-1))]}
  n=$(python3 -c "print(round($d*$FPS))")
  ffmpeg -loglevel error -y -loop 1 -framerate $FPS -t $d -i $T/s$i.jpg -i cartelas/wm.png -filter_complex \
    "[0]scale=3840:2160,zoompan=z='1+0.07*on/$n':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=$FPS[z];[z][1]overlay,format=yuv420p" \
    -frames:v $n -c:v libx264 -preset medium -crf 18 $T/c$i.mp4
  echo "file 'c$i.mp4'" >> $T/lista.txt
done
ffmpeg -loglevel error -y -f concat -safe 0 -i $T/lista.txt -c copy $T/video.mp4

# Voz: cada frase começa 0,15s depois do início da sua cena
INI=0; FILT=""; INPUTS=""; k=0
for i in 1 2 3 4 5 6 7; do
  ms=$(python3 -c "print(int(($INI+0.15)*1000))")
  INPUTS="$INPUTS -i voz/v$i.wav"
  FILT="$FILT[$k]adelay=${ms}|${ms}[a$k];"
  INI=$(python3 -c "print($INI+${DUR[$((i-1))]})")
  k=$((k+1))
done
MIX=""; for j in $(seq 0 6); do MIX="$MIX[a$j]"; done
TRILHA_IN=""; TRILHA_MIX=""
if [ -f trilha.mp3 ]; then
  TRILHA_IN="-i trilha.mp3"
  FILT="$FILT[7]volume=0.18,afade=t=out:st=$(python3 -c "print($INI-1.5)"):d=1.5[t];"
  MIX="$MIX[t]"; NIN=8
else
  NIN=7
fi
ffmpeg -loglevel error -y $INPUTS $TRILHA_IN -filter_complex \
  "${FILT}${MIX}amix=inputs=$NIN:normalize=0,apad,atrim=0:$INI,loudnorm=I=-16:TP=-1.5[out]" \
  -map "[out]" -ar 48000 $T/audio.wav

ffmpeg -loglevel error -y -i $T/video.mp4 -i $T/audio.wav -c:v copy -c:a aac -b:a 192k -shortest veeem-animatic-30s.mp4
echo "Pronto: $(pwd)/veeem-animatic-30s.mp4 ($INI s)"
