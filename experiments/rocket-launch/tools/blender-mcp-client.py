"""Development client for the official installed Blender MCP server (stdio + SDK)."""
import asyncio, json, os, sys
from pathlib import Path
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    prompt=sys.argv[2] if len(sys.argv)>2 else '好的，帮我安装MCP后再重新建模一下荷载吧。'
    params = StdioServerParameters(command=str(Path.home()/'.local/bin/uvx.exe'), args=['mcp-for-blender'], env=dict(os.environ))
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=timedelta(seconds=300)) as session:
            await session.initialize()
            available = await session.list_tools()
            print('MCP_CONNECTED', len(available.tools), 'tools', flush=True)
            if len(sys.argv) == 1:
                result = await session.call_tool('get_scene_info', {'user_prompt':prompt})
            else:
                script=Path(sys.argv[1]).resolve()
                prefix=''
                if script.name=='build-interior-upgrade.py':
                    source=script.parents[1]/'assets/cz7-kiu-20261116/cz7-kiu.blend'
                    loaded=await session.call_tool('execute_blender_code', {'code':'import bpy\nbpy.ops.wm.open_mainfile(filepath='+repr(str(source))+')\nprint("SOURCE_LOADED")','user_prompt':prompt})
                    for item in loaded.content:
                        if hasattr(item,'text'): print(item.text,flush=True)
                    prefix='MCP_SCENE_READY=True\n'
                code='__file__='+repr(str(script))+'\n'+prefix+script.read_text(encoding='utf-8-sig')
                result=await session.call_tool('execute_blender_code', {'code':code,'user_prompt':prompt})
            for item in result.content:
                if hasattr(item,'text'):
                    print(item.text, flush=True)
                    if item.text.startswith(('Error executing code:', 'Rejected by')): raise RuntimeError('Blender execution failed')
            if result.isError: raise RuntimeError('MCP tool failed')

asyncio.run(main())
