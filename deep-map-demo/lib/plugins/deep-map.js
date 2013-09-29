/*
Plugin Name: Deep Map
Plugin URI: https://github.com/laborin/impactjs-plugins
Description: Draws a perspective cube behind every tile of a background map in an ImpactJS game. Great for making 2.5D games.
Version: 0.1
Revision Date: 09-09-2013
Requires: ImpactJS
Author: Emmanuel Laborin - laborin@gmail.com
How to use: require() this module in your ImpactJS game and rename a layer in your level to have "3d" at the end.
Changelog
---------
0.1: Initial release.
*/

ig.module(
	'plugins.deep-map'
	)
.requires(
	'impact.system',
	'impact.image',
	'impact.background-map'
	)
.defines(function()
{
	ig.BackgroundMap.inject(
	{
		is3d: null,
		distanceRatio: 0.92,
		centerx: 0,
		centery: 0,
		maxDistance: 0,

		init: function( tilesize, data, tileset )
		{
			this.centerx = (ig.system.width * ig.system.scale) / 2;
			this.centery = (ig.system.height * ig.system.scale) / 2;
			this.maxDistance = Math.sqrt(Math.pow((ig.system.canvas.width * ig.system.scale) / 2,2)+Math.pow((ig.system.canvas.height * ig.system.scale) / 2,2));
			this.parent(tilesize,data,tileset);
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

			// At init() time, the object does not have the "name" property set, so i am checking
			// for it here... every frame =S... should think of a better approach
			if(this.name != null && this.name.endsWith("3d")) this.is3d = true; else this.is3d = false;

			// Just copied the main background render loop, as all "3D faces" should be drawn BEFORE any tile
			if(this.is3d)
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
							this.calculateBuffer3d(pxX,pxY,tileY,tileX);
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

		draw3dFace: function(face)
		{
			// This is to make the farthest (from screen center) faces darker
			// We could set a single color for all faces and make a single fill()
			// with a big canvas path covering all the faces, but this way it
			// looks much better
			var color = (Math.floor(Math.abs(face.distanceToCenter / this.maxDistance) * 190) * -1) + 145;
			if(color < 70) color = 70;
			var fillStyle = "rgba("+color+","+color+","+color+",1)";

			ig.system.context.fillStyle = fillStyle;
			ig.system.context.lineWidth = 0;
			ig.system.context.beginPath();
			ig.system.context.moveTo(face.points[0][0],face.points[0][1]);
			ig.system.context.lineTo(face.points[1][0],face.points[1][1]);
			ig.system.context.lineTo(face.points[2][0],face.points[2][1]);
			ig.system.context.lineTo(face.points[3][0],face.points[3][1]);
			ig.system.context.lineTo(face.points[0][0],face.points[0][1]);
			ig.system.context.fill();
		},

		distanceToCenter: function(x,y)
		{
			return Math.sqrt(Math.pow(x-this.centerx,2)+Math.pow(y-this.centery,2));
		},

		calculateBuffer3d: function(x,y,tY,tX)
		{
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
				sideLeft.points.push([screenx,screeny]);
				sideLeft.points.push([backgroundx,backgroundy]);
				screenx = x /* * ig.system.scale*/;
				screeny = (y /** ig.system.scale*/)+this.tilesize * ig.system.scale;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideLeft.points.push([backgroundx,backgroundy]);
				sideLeft.points.push([screenx,screeny]);
				sideLeft.distanceToCenter = this.distanceToCenter((sideLeft.points[0][0]+sideLeft.points[2][0])/2,(sideLeft.points[0][1]+sideLeft.points[2][1])/2);
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
				sideTop.points.push([screenx,screeny]);
				sideTop.points.push([backgroundx,backgroundy]);
				screenx = x+this.tilesize * ig.system.scale;
				screeny = y;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideTop.points.push([backgroundx,backgroundy]);
				sideTop.points.push([screenx,screeny]);
				sideTop.distanceToCenter = this.distanceToCenter((sideTop.points[0][0]+sideTop.points[3][0])/2,(sideTop.points[0][1]+sideTop.points[3][1])/2);
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
				sideBottom.points.push([backgroundx,backgroundy]);
				screenx = x+this.tilesize * ig.system.scale;
				screeny = y+this.tilesize * ig.system.scale;
				backgroundx = (screenx *this.distanceRatio) + ((ig.system.width * ig.system.scale) / 2) -(backgroundWidth/2);
				backgroundy = (screeny *this.distanceRatio)  + ((ig.system.height * ig.system.scale) / 2) - (backgroundHeight/2);
				sideBottom.points.push([backgroundx,backgroundy]);
				sideBottom.points.push([screenx,screeny]);
				sideBottom.distanceToCenter = this.distanceToCenter((sideBottom.points[0][0]+sideBottom.points[3][0])/2,(sideBottom.points[0][1]+sideBottom.points[3][1])/2);
				this.buffer3d.push(sideBottom);
			}
		}

	});

	String.prototype.endsWith = function(suffix)
	{
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};

	//This function was used to sort the 3D faces array. Is left here just in case I roll back.
	var compareDistances = function(a,b) {
		return b.distanceToCenter - a.distanceToCenter;
	};
});
