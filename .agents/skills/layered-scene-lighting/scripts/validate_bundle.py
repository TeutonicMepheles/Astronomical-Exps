"""Validate an explicit layered-lighting production bundle; requires Pillow."""

import argparse
import hashlib
import json
from pathlib import Path


def validate(manifest_path, min_pixels=4_000_000):
    from PIL import Image

    manifest_path = Path(manifest_path).resolve()
    root = manifest_path.parent
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Manifest must be an object")
    if manifest.get("version") != 1:
        raise ValueError("Unsupported manifest version")
    resources = manifest.get("resources")
    if not isinstance(resources, list) or not resources:
        raise ValueError("resources must be a nonempty list")
    indexed, resource_paths, groups, checked = {}, {}, {}, []
    for resource in resources:
        if not isinstance(resource, dict):
            raise ValueError("Each resource must be an object")
        resource_id = resource["id"]
        if not isinstance(resource_id, str) or not resource_id or resource_id in indexed:
            raise ValueError(f"Invalid or duplicate resource id: {resource_id}")
        relative = resource["path"]
        if not isinstance(relative, str) or not relative or ":" in relative or relative.startswith(("/", "\\")):
            raise ValueError(f"Not a bundle-relative resource path: {relative}")
        path = (root / relative.replace("\\", "/")).resolve()
        if not path.is_relative_to(root) or path == root:
            raise ValueError(f"Resource escapes bundle: {relative}")
        with Image.open(path) as image:
            size = image.size
            if size != (resource["width"], resource["height"]):
                raise ValueError(f"Declared canvas differs from image: {resource_id}")
            if size[0] * size[1] < min_pixels:
                raise ValueError(f"Production image below required pixel count: {resource_id}")
            image.verify()
        if resource.get("requireTransparency"):
            with Image.open(path) as image:
                if image.convert("RGBA").getchannel("A").getextrema()[0] != 0:
                    raise ValueError(f"No transparent pixels: {resource_id}")
        group = resource.get("canvasGroup")
        if group:
            if group in groups and groups[group] != size:
                raise ValueError(f"Canvas group mismatch: {group}")
            groups[group] = size
        if resource.get("sha256"):
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            if actual != resource["sha256"]:
                raise ValueError(f"Resource hash mismatch: {resource_id}")
        indexed[resource_id] = resource
        resource_paths[resource_id] = path
        checked.append({"id": resource_id, "path": relative, "size": list(size)})
    channels = manifest.get("channels", [])
    if not isinstance(channels, list):
        raise ValueError("channels must be a list")
    channel_ids, owners = set(), {}
    for channel in channels:
        if not isinstance(channel, dict):
            raise ValueError("Each channel must be an object")
        channel_id = channel["id"]
        if not isinstance(channel_id, str) or not channel_id or channel_id in channel_ids:
            raise ValueError(f"Invalid or duplicate channel id: {channel_id}")
        channel_ids.add(channel_id)
        for role in ("emission", "receivers", "halo"):
            references = channel.get(role, [])
            if not isinstance(references, list):
                raise ValueError(f"{channel_id}.{role} must be a list")
            for reference in references:
                if not isinstance(reference, str) or reference not in indexed:
                    raise ValueError(f"Unknown resource reference: {channel_id}/{reference}")
                if indexed[reference].get("role") == "light":
                    identity = resource_paths[reference]
                    if identity in owners and owners[identity] != channel_id:
                        raise ValueError(f"Light increment owned by multiple channels: {reference}")
                    owners[identity] = channel_id
    return {
        "valid": True,
        "resourceCount": len(checked),
        "channelCount": len(channels),
        "minimumPixels": min_pixels,
        "resources": checked,
        "limits": "File, canvas and reference validation only; not art, photometry or runtime acceptance.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = validate(args.manifest)
    except (ValueError, KeyError, OSError, ImportError) as error:
        parser.exit(1, f"Bundle invalid: {error}\n")
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(text + "\n", encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
