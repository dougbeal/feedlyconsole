#!/usr/bin/env python
import os

from pprint import pprint as pp
import json
import shutil

def main():
    source = os.path.join(os.path.expanduser("~"), "icon")
    destination = "icon"

    # http://openiconlibrary.sourceforge.net/downloads.html
    # Creative Common Package
    print "source " + source
    name = "utilities-terminal-5.png"
    namepart, extpart = os.path.splitext(name)
    svg = "%s.svg" % namepart

    sizes = (16, 22, 32, 48, 128)
    info = {}
    for root, dirs, files in os.walk(source):
        if svg in files:
            source_path = os.path.join(root, svg)
            destination_path = os.path.join(destination, svg)
            info['svg'] = destination_path
            shutil.copyfile(source_path,
                            destination_path)
        if name in files:
            path = root.split(os.sep)
            size = path[-2].split('x')[0]
            if int(size) in sizes:

                newname = "%s_%s%s" % (namepart, size, extpart)
                pp(newname)

                source_path = os.path.join(root, name)
                destination_path = os.path.join(destination, newname)
                info[size] = destination_path
                # todo: extract tags?
                #tags = exifread.process_file(open(source_path, 'rb'))
                #pp(tags)
                shutil.copyfile(source_path,
                                destination_path)


    sizes = [19, 38]
    source = os.path.join(destination, svg)
    for size in sizes:
        filename = "%s_%i%s" % (namepart, size, extpart)
        destination_path = os.path.join(destination, filename)
        info[size] = destination_path
        os.system("convert -resample %ix%i %s %s" % (size, size, source, destination_path))

    namepart = open(os.path.join(destination, "icon_info.json"), 'w')
    json_info = json.dumps(info, sort_keys=True, indent=4)
    print json_info
    namepart.write(json_info)

if __name__ == '__main__':
    main()
