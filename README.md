# impactjs-plugins 

Here i will be uploading my shareable ImpactJS plugins.

## Deep Map plugin

Adds 3D depth to any background map, great for creating 2.5D games. The 3D faces are drawn in a solid gray color, with simulated light coming from the center of the screen. A future version will include texture mapping, I am figuring out how to do it without changing any impactjs file, maybe setting an alternate tilesheet for the side faces of every regular tile.

### How to use it:

* require() the deep-map module in your ImpactJS game.
* open weltmeister and rename any of your background maps to have "3d" at the end. For better results, use only rectangular tiles (without transparency at the edges).
* have fun

[Demo video](https://www.youtube.com/watch?v=KG365l-raoQ "Deep Map plugin demo video")
[Demo based on the super generic run and jump sample](http://bytecreators.com/samples/deep-map/)
