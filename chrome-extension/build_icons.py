#!/usr/bin/env python
import os

from pprint import pprint as pp
import json
import shutil

source = os.path.join(os.path.expanduser("~"), "icon")
destination = "icon"

# http://openiconlibrary.sourceforge.net/downloads.html
# Creative Common Package
print "source " + source
name = "utilities-terminal-5.png"
sizes = ( 16, 22, 32, 48, 128 )
info = {}
for root, dirs, files in os.walk(source):
    if name in files:
        path = root.split(os.sep)
        size = path[-2].split('x')[0]
        if int(size) in sizes:
            f,e = os.path.splitext(name)
            newname = "%s_%s%s" % (f, size, e)
            pp(newname)

            source_path = os.path.join(root, name)
            destination_path = os.path.join(destination, newname)
            info[size] = destination_path
            # todo: extract tags?
            #tags = exifread.process_file(open(source_path, 'rb'))
            #pp(tags)
            shutil.copyfile(source_path,
                            destination_path)

f = open(os.path.join(destination, "icon_info.json"), 'w')
json_info = json.dumps(info, sort_keys=True, indent=4)
print json_info
f.write(json_info)

