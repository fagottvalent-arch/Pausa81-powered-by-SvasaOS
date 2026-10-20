# Animazioni Rive

Metti qui il file `sphere.riv` scaricato dalla Rive Community.

Il componente `Sphere` carica `/animations/sphere.riv` e si aspetta:

- una **State Machine** chiamata `State Machine 1`
- un **input numerico** chiamato `breath` (0 = contratta, 1 = espansa)

Finché il file non è presente (o non è caricabile), l'app usa automaticamente
una sfera CSS di fallback che respira in sincronia con le fasi.
