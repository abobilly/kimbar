export interface TiledLayer {
  name: string;
  width: number;
  height: number;
  data?: number[];
  objects?: Array<Record<string, any>>;
}

export interface TiledTilesetRef {
  firstgid: number;
  source: string;
}

export interface TiledRoom {
  name: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: Record<string, TiledLayer>;
  tilesets: TiledTilesetRef[];
}

function parseCsv(data: string): number[] {
  return data
    .trim()
    .split(',')
    .map((value) => parseInt(value.trim(), 10));
}

export async function loadTiledRoom(roomUrl: string): Promise<TiledRoom> {
  const response = await fetch(roomUrl);
  if (!response.ok) {
    throw new Error(`Failed to load TMX from ${roomUrl}: ${response.status}`);
  }
  const text = await response.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  const mapNode = xml.querySelector('map');
  if (!mapNode) {
    throw new Error(`Invalid TMX: missing map tag (${roomUrl})`);
  }

  const getAttr = (node: Element, name: string, fallback = ''): string =>
    node.getAttribute(name) ?? fallback;

  const tilesets: TiledTilesetRef[] = Array.from(xml.querySelectorAll('tileset')).map((node) => ({
    firstgid: parseInt(getAttr(node, 'firstgid', '0'), 10),
    source: getAttr(node, 'source', '')
  }));

  const layers: Record<string, TiledLayer> = {};
  const layerNodes = xml.querySelectorAll('layer');
  layerNodes.forEach((layer) => {
    const name = getAttr(layer, 'name');
    const width = parseInt(getAttr(layer, 'width', '0'), 10);
    const height = parseInt(getAttr(layer, 'height', '0'), 10);
    const dataNode = layer.querySelector('data');
    const data = dataNode?.textContent ? parseCsv(dataNode.textContent) : undefined;
    layers[name] = { name, width, height, data };
  });

  const objectLayers = xml.querySelectorAll('objectgroup');
  objectLayers.forEach((group) => {
    const name = getAttr(group, 'name');
    const objects = Array.from(group.querySelectorAll('object')).map((obj) => {
      const entry: Record<string, any> = {
        id: obj.getAttribute('id'),
        name: obj.getAttribute('name'),
        type: obj.getAttribute('type'),
        x: parseFloat(obj.getAttribute('x') || '0'),
        y: parseFloat(obj.getAttribute('y') || '0'),
        width: parseFloat(obj.getAttribute('width') || '0'),
        height: parseFloat(obj.getAttribute('height') || '0')
      };
      const props = obj.querySelectorAll('properties > property');
      if (props.length > 0) {
        entry.properties = {};
        props.forEach((prop) => {
          const propName = prop.getAttribute('name');
          if (!propName) return;
          entry.properties[propName] = prop.getAttribute('value') ?? prop.textContent ?? '';
        });
      }
      return entry;
    });
    layers[name] = { name, width: 0, height: 0, objects };
  });

  return {
    name: getAttr(mapNode, 'name', ''),
    width: parseInt(getAttr(mapNode, 'width', '0'), 10),
    height: parseInt(getAttr(mapNode, 'height', '0'), 10),
    tileWidth: parseInt(getAttr(mapNode, 'tilewidth', '32'), 10),
    tileHeight: parseInt(getAttr(mapNode, 'tileheight', '32'), 10),
    layers,
    tilesets
  };
}
