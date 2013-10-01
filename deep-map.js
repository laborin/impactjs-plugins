/*
Plugin Name: Deep Map
Plugin URI: https://github.com/laborin/impactjs-plugins
Description: Draws a perspective cube behind every tile of a background map in an ImpactJS game. Great for making 2.5D games.
Version: 0.1
Revision Date: 30-09-2013
Requires: ImpactJS
Author: Emmanuel Laborin - laborin@gmail.com
How to use: require() this module in your ImpactJS game and rename a layer in your level to have "3d" at the end.
Changelog
---------
0.1:
	* Initial release.
0.2:
	* Now works well with resizable canvas.
	* Added texture mapping.
*/

ig.module(
	'plugins.deep-map'
	)
.requires(
	'impact.system',
	'impact.image',
	'impact.game',
	'impact.background-map'
	)
.defines(function()
{
	// I'm overriding the loadLevel function to pass the backgroundMap's name to it's constructor
	ig.Game.inject(
	{
		loadLevel: function( data )
		{
			this.screen = {x: 0, y: 0};

			// Entities
			this.entities = [];
			this.namedEntities = {};
			for( var i = 0; i < data.entities.length; i++ )
			{
				var ent = data.entities[i];
				this.spawnEntity( ent.type, ent.x, ent.y, ent.settings );
			}
			this.sortEntities();
			
			// Map Layer
			this.collisionMap = ig.CollisionMap.staticNoCollision;
			this.backgroundMaps = [];
			for( var i = 0; i < data.layer.length; i++ )
			{
				var ld = data.layer[i];
				if( ld.name == 'collision' )
				{
					this.collisionMap = new ig.CollisionMap(ld.tilesize, ld.data );
				}
				else
				{
					var newMap = new ig.BackgroundMap(ld.tilesize, ld.data, ld.tilesetName, ld.name);
					newMap.anims = this.backgroundAnims[ld.tilesetName] || {};
					newMap.repeat = ld.repeat;
					newMap.distance = ld.distance;
					newMap.foreground = !!ld.foreground;
					newMap.preRender = !!ld.preRender;
					this.backgroundMaps.push( newMap );
				}
			}
			
			// Call post-init ready function on all entities
			for( var i = 0; i < this.entities.length; i++ )
			{
				this.entities[i].ready();
			}
		}
	});

	ig.BackgroundMap.inject(
	{
		deepMapEnabled: null,
		textureMappingEnabled: true,
		textureShadowEnabled: true,
		distanceRatio: 0.92,
		centerx: 0,
		centery: 0,
		maxDistance: 0,
		textureOverrides: null,
		/*
			Example textureOverrides:
			textureOverrides =
			{
				0: {"left": 3}, //Draw the tile 3 on the left face of tile 0
				5: {"top": 0, "bottom": 0} //Draw tile 0 on the top and bottom face of tile 5
			}
		*/

		init: function( tilesize, data, tileset, name, gameClassName )
		{
			this.name = name;
			this.parent( tilesize, data );
			this.setTileset( tileset );
			if(this.name != null && this.name.endsWith("3d")) this.deepMapEnabled = true; else this.deepMapEnabled = false;
			if(ig.textureOverrides && ig.textureOverrides[this.name]) this.textureOverrides = ig.textureOverrides[this.name];
		},

		drawTiled: function()
		{
			var tile = 0,
			anim = null,
			tileOffsetX = (this.scroll.x / this.tilesize).toInt(),
			tileOffsetY = (this.scroll.y / this.tilesize).toInt(),
			pxOffsetX = this.scroll.x % this.tilesize,
			pxOffsetY = this.scroll.y % this.tilesize,
			pxMinX = -pxOffsetX - this.tilesize,
			pxMinY = -pxOffsetY - this.tilesize,
			pxMaxX = ig.system.width + this.tilesize - pxOffsetX,
			pxMaxY = ig.system.height + this.tilesize - pxOffsetY;

			// Just copied the main background render loop, as all "3D faces" should be drawn BEFORE any tile
			if(this.deepMapEnabled)
			{
				this.buffer3d = [];
				for( var mapY = -1, pxY = pxMinY; pxY < pxMaxY; mapY++, pxY += this.tilesize)
				{
					var tileY = mapY + tileOffsetY;
					// Repeat Y?
					if( tileY >= this.height || tileY < 0 )
					{
						if( !this.repeat ) { continue; }
						tileY = (tileY%this.height + this.height) % this.height;
					}

					for( var mapX = -1, pxX = pxMinX; pxX < pxMaxX; mapX++, pxX += this.tilesize )
					{
						var tileX = mapX + tileOffsetX;

						// Repeat X?
						if( tileX >= this.width || tileX < 0 )
						{
							if( !this.repeat ) { continue; }
							tileX = (tileX%this.width + this.width) % this.width;
						}

						if( (tile = this.data[tileY][tileX]) )
						{
							// Calculate this tile 3D faces instead of drawing the tile image.
							this.calculateBuffer3d(pxX,pxY,tileY,tileX,tile-1);
						}
					} // end for x
				} // end for y

				// As now the hidden faces aren't drawn I think there is no need to sort the faces
				// This saves a lot of processing time
				/*this.buffer3d.sort(compareDistances);*/
				for(var i = 0; i<this.buffer3d.length;i++)
				{
					this.draw3dFace(this.buffer3d[i]);
				}
			}

			// Ok, from here, the original BackgroundMap's drawTiled() code. Im rewriting it here
			// instead of calling the parent function to re-use the variables set at the top.

			// FIXME: could be sped up for non-repeated maps: restrict the for loops
			// to the map size instead of to the screen size and skip the 'repeat'
			// checks inside the loop.
			for( var mapY = -1, pxY = pxMinY; pxY < pxMaxY; mapY++, pxY += this.tilesize)
			{
				var tileY = mapY + tileOffsetY;

				// Repeat Y?
				if( tileY >= this.height || tileY < 0 )
				{
					if( !this.repeat ) { continue; }
					tileY = (tileY%this.height + this.height) % this.height;
				}
				
				for( var mapX = -1, pxX = pxMinX; pxX < pxMaxX; mapX++, pxX += this.tilesize )
				{
					var tileX = mapX + tileOffsetX;
					
					// Repeat X?
					if( tileX >= this.width || tileX < 0 )
					{
						if( !this.repeat ) { continue; }
						tileX = (tileX%this.width + this.width) % this.width;
					}
					
					// Draw!
					if( (tile = this.data[tileY][tileX]) )
					{
						if( (anim = this.anims[tile-1]) )
						{
							anim.draw( pxX, pxY );
						}
						else
						{
							this.tiles.drawTile( pxX, pxY, tile-1, this.tilesize );
						}
					}
				} // end for x
			} // end for y
		},

		draw3dFace: function(face,tile)
		{
			if(!this.textureMappingEnabled)
			{
				// This is to make the farthest (from screen center) faces darker
				// We could set a single color for all faces and make a single fill()
				// with a big canvas path covering all the faces, but this way it
				// looks much better
				var color = (Math.floor(Math.abs(face.distanceToCenter / this.maxDistance) * 190) * -1) + 145;
				if(color < 70) color = 70;
				var fillStyle = "rgba("+color+","+color+","+color+",1)";

				ig.system.context.fillStyle = fillStyle;
				ig.system.context.beginPath();
				ig.system.context.moveTo(face.points[0][0],face.points[0][1]);
				ig.system.context.lineTo(face.points[1][0],face.points[1][1]);
				ig.system.context.lineTo(face.points[2][0],face.points[2][1]);
				ig.system.context.lineTo(face.points[3][0],face.points[3][1]);
				ig.system.context.lineTo(face.points[0][0],face.points[0][1]);
				ig.system.context.fill();
			}else
			{
				// The tile we will render
				var tile = face.tile;
				// Override the default tile, if set in textureOverrides property
				if(this.textureOverrides && this.textureOverrides[face.tile] && this.textureOverrides[face.tile][face.type]) tile = this.textureOverrides[face.tile][face.type];
				var tileX = ( Math.floor(tile * this.tilesize) % this.tiles.data.width ) * ig.system.scale;
				var tileY = ( Math.floor(tile * this.tilesize / this.tiles.data.width) * this.tilesize ) * ig.system.scale;

				var texturePoints =
				[
					{x: face.points[0][0], y: face.points[0][1], u: tileX, v: tileY},
					{x: face.points[1][0], y: face.points[1][1], u: tileX+this.tilesize, v: tileY},
					{x: face.points[2][0], y: face.points[2][1], u: tileX+this.tilesize, v: tileY+this.tilesize},
					{x: face.points[3][0], y: face.points[3][1], u: tileX, v: tileY+this.tilesize}
				];
				this.textureMap(ig.system.context,this.tiles.data,texturePoints);
				if(this.textureShadowEnabled)
				{
					var shadow = (Math.abs(face.distanceToCenter / this.maxDistance));
					shadow *= 0.75;
					var fillStyle = "rgba(0,0,0,"+shadow+")";

					ig.system.context.fillStyle = fillStyle;
					ig.system.context.beginPath();
					ig.system.context.moveTo(face.points[0][0],face.points[0][1]);
					ig.system.context.lineTo(face.points[1][0],face.points[1][1]);
					ig.system.context.lineTo(face.points[2][0],face.points[2][1]);
					ig.system.context.lineTo(face.points[3][0],face.points[3][1]);
					ig.system.context.lineTo(face.points[0][0],face.points[0][1]);
					ig.system.context.fill();
				}
			}
		},

		// Taken from stackoverflow user: 6502 (Andrea Griffini):
		// http://stackoverflow.com/questions/4774172/image-manipulation-and-texture-mapping-using-html5-canvas
		// Andrea Griffini's website: http://www.gripho.it
		textureMap: function (ctx, texture, pts)
		{
			var tris = [[0, 1, 2], [2, 3, 0]]; // Split in two triangles
			for (var t=0; t<2; t++)
			{
				var pp = tris[t];
				var x0 = pts[pp[0]].x, x1 = pts[pp[1]].x, x2 = pts[pp[2]].x;
				var y0 = pts[pp[0]].y, y1 = pts[pp[1]].y, y2 = pts[pp[2]].y;
				var u0 = pts[pp[0]].u, u1 = pts[pp[1]].u, u2 = pts[pp[2]].u;
				var v0 = pts[pp[0]].v, v1 = pts[pp[1]].v, v2 = pts[pp[2]].v;

				// Set clipping area so that only pixels inside the triangle will
				// be affected by the image drawing operation
				ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
				ctx.lineTo(x2, y2); ctx.closePath(); ctx.clip();

				// Compute matrix transform
				var delta = u0*v1 + v0*u2 + u1*v2 - v1*u2 - v0*u1 - u0*v2;
				var delta_a = x0*v1 + v0*x2 + x1*v2 - v1*x2 - v0*x1 - x0*v2;
				var delta_b = u0*x1 + x0*u2 + u1*x2 - x1*u2 - x0*u1 - u0*x2;
				var delta_c = u0*v1*x2 + v0*x1*u2 + x0*u1*v2 - x0*v1*u2
							- v0*u1*x2 - u0*x1*v2;
				var delta_d = y0*v1 + v0*y2 + y1*v2 - v1*y2 - v0*y1 - y0*v2;
				var delta_e = u0*y1 + y0*u2 + u1*y2 - y1*u2 - y0*u1 - u0*y2;
				var delta_f = u0*v1*y2 + v0*y1*u2 + y0*u1*v2 - y0*v1*u2
							- v0*u1*y2 - u0*y1*v2;

				// Draw the transformed image
				ctx.transform(delta_a/delta, delta_d/delta,
							delta_b/delta, delta_e/delta,
							delta_c/delta, delta_f/delta);
				ctx.drawImage(texture, 0, 0);
				ctx.restore();
			}
		},

		distanceToCenter: function(x,y)
		{
			return Math.sqrt(Math.pow(x-this.centerx,2)+Math.pow(y-this.centery,2));
		},

		calculateBuffer3d: function(x,y,tY,tX,tile)
		{
			this.centerx = (ig.system.width * ig.system.scale) / 2;
			this.centery = (ig.system.height * ig.system.scale) / 2;
			this.maxDistance = Math.sqrt(Math.pow((ig.system.canvas.width * ig.system.scale) / 2,2)+Math.pow((ig.system.canvas.height * ig.system.scale) / 2,2));

			// Each tile have four faces. Here we are calculating which faces we should draw.
			x = ig.system.getDrawPos(x);
			y = ig.system.getDrawPos(y);

			var backgroundWidth = (ig.system.width * ig.system.scale) *this.distanceRatio;
			var backgroundHeight = (ig.system.height * ig.system.scale) *this.distanceRatio;

			// Left face
			// Only add the tile's left face to the buffer if the tile does not have a neighbor at the left
			// AND only if it is at the right side of the screen
			if((typeof this.data[tY][tX-1] === 'undefined' || this.data[tY][tX-1] == 0) && x > this.centerx)
			{
				var sideLeft = {points:[]};
				var screenx = x/* * ig.system.scale*/;
				var screeny = y  /* *ig.system.scale*/;
				var backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				var backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideLeft.points.push([backgroundx,backgroundy]);
				sideLeft.points.push([screenx,screeny]);
				screenx = x /* * ig.system.scale*/;
				screeny = (y /** ig.system.scale*/)+this.tilesize * ig.system.scale;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideLeft.points.push([screenx,screeny]);
				sideLeft.points.push([backgroundx,backgroundy]);
				sideLeft.distanceToCenter = this.distanceToCenter((sideLeft.points[0][0]+sideLeft.points[2][0])/2,(sideLeft.points[0][1]+sideLeft.points[2][1])/2);
				sideLeft.tile=tile;
				sideLeft.type="left";
				this.buffer3d.push(sideLeft);
			}

			// Top face
			if((typeof this.data[tY-1] === 'undefined' || this.data[tY-1][tX] == 0) && y > this.centery)
			{
				var sideTop = {points:[]};
				screenx = x;
				screeny = y;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				var p4 = [screenx,screeny];
				sideTop.points.push([backgroundx,backgroundy]);
				screenx = x+this.tilesize * ig.system.scale;
				screeny = y;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideTop.points.push([backgroundx,backgroundy]);
				sideTop.points.push([screenx,screeny]);
				sideTop.points.push(p4);
				sideTop.distanceToCenter = this.distanceToCenter((sideTop.points[0][0]+sideTop.points[3][0])/2,(sideTop.points[0][1]+sideTop.points[3][1])/2);
				sideTop.tile=tile;
				sideTop.type="top";
				this.buffer3d.push(sideTop);
			}

			// Right face
			if((typeof this.data[tY][tX+1] === 'undefined' || this.data[tY][tX+1] == 0) && (x+this.tilesize * ig.system.scale) < this.centerx)
			{
				var sideRight = {points:[]};
				screenx = x+this.tilesize * ig.system.scale;
				screeny = y;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideRight.points.push([screenx,screeny]);
				sideRight.points.push([backgroundx,backgroundy]);
				screenx = x+this.tilesize * ig.system.scale;
				screeny = y+this.tilesize * ig.system.scale;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideRight.points.push([backgroundx,backgroundy]);
				sideRight.points.push([screenx,screeny]);
				sideRight.distanceToCenter = this.distanceToCenter((sideRight.points[0][0]+sideRight.points[3][0])/2,(sideRight.points[0][1]+sideRight.points[3][1])/2);
				sideRight.tile=tile;
				sideRight.type="right";
				this.buffer3d.push(sideRight);
			}

			// Bottom face
			if((typeof this.data[tY+1] === 'undefined' || this.data[tY+1][tX] == 0) && (y+this.tilesize * ig.system.scale) < this.centery)
			{
				var sideBottom = {points:[]};
				screenx = x;
				screeny = y+this.tilesize * ig.system.scale;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideBottom.points.push([screenx,screeny]);
				var p4=[backgroundx,backgroundy];
				screenx = x+this.tilesize * ig.system.scale;
				screeny = y+this.tilesize * ig.system.scale;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideBottom.points.push([screenx,screeny]);
				sideBottom.points.push([backgroundx,backgroundy]);
				sideBottom.points.push(p4);
				sideBottom.distanceToCenter = this.distanceToCenter((sideBottom.points[0][0]+sideBottom.points[3][0])/2,(sideBottom.points[0][1]+sideBottom.points[3][1])/2);
				sideBottom.tile=tile;
				sideBottom.type="bottom";
				this.buffer3d.push(sideBottom);
			}
		}

	});

	ig.textureOverrides = [];
	String.prototype.endsWith = function(suffix)
	{
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};

	//This function was used to sort the 3D faces array. Is left here just in case I roll back.
	var compareDistances = function(a,b) {
		return b.distanceToCenter - a.distanceToCenter;
	};
});
