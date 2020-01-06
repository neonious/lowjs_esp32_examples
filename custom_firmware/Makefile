# You need to set the following parameters according to the documentation
PRO_KEY=...

FLASH_PORT=...

# Flashing is a lot faster with this setting
# Only enable if you have a perfectly fine USB connection
#FLASH_BAUD=-b 921600
FLASH_BAUD=


all: build

clean:
	rm -rf dist file_system/dist file_system/server

# Build firmware for flashing or OTA updating
build-parts: clean
	npm run build
	(cd server_buildenv; npx babel ../server --out-dir ../file_system/server)
	ln -s ../dist file_system/dist

build: build-parts
	lowsync build --firmware-config=lowbuild.config.json firmware.dat

# Flash firmware
flash: build
	lowsync flash --init --firmware-file=firmware.dat --pro-key=$(PRO_KEY) --port=$(FLASH_PORT) $(FLASH_BAUD)

# Run local test version
run-test: build-parts
	node test_server/
