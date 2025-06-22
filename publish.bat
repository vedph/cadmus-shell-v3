@echo off
echo NPM PUBLISH
echo Before continuing, ensure that:
echo - you are logged in (npm whoami)
echo - you have successfully rebuilt all the libraries (npm run...)
pause

cd .\dist\myrmidon\cadmus-api
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-core
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-flags-pg
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-flags-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-graph-pg
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-graph-pg-ex
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-graph-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-graph-ui-ex
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-item-editor
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-item-list
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-item-search
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-layer-demo
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-general-pg
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-general-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-philology-pg
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-philology-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-preview-pg
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-preview-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-profile-core
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-state
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-statistics
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-thesaurus-editor
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-thesaurus-list
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-thesaurus-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-ui
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-ui-pg
call npm publish --access=public
cd ..\..\..
pause

echo ALL DONE
