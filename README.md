# impactjs-plugins 

Here i will be uploading my shareable ImpactJS plugins.

## Deep Map plugin

Adds 3D depth to any background map, great for creating 2.5D games. The 3D faces are drawn with texture mapping or in a solid gray color, with simulated light coming from the center of the screen. The texture used for the side faces of a tile is the tile itself by default, but you can override it to show a different tile for the top, left, right and bottom face.

### How to use it:

* require() the deep-map module in your ImpactJS game.
* open weltmeister and rename any of your background maps to have "3d" at the end. For better results, use only rectangular tiles (without transparency at the edges).
* have fun

### Overriding default textures
Simply add an entry to ig.textureOverrides array with the name of your background map. Important: As impact does not define a name for a level, if you want to override tiles from several levels you should name your layers differently between levels. For example: level1_platform_3d and level2_platform_3d.

Sample, taken from the demo project included:
```
//Set all texture overrides before loading any level
ig.textureOverrides["main_3d"] = {
	77: {"top": 176}, //Change the top face for tile 77 to 176
	119: {"top": 179}
};
```


[Demo video](https://www.youtube.com/watch?v=KG365l-raoQ "Deep Map plugin demo video")

[Demo based on the super generic run and jump sample](http://bytecreators.com/samples/deep-map/)
