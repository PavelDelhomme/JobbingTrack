CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11 -D_GNU_SOURCE
LDFLAGS = -lpq -lcurl -lm

SRCDIR = src
INCDIR = include
OBJDIR = obj
BINDIR = bin

SOURCES = $(wildcard $(SRCDIR)/*.c)
OBJECTS = $(patsubst $(SRCDIR)/%.c,$(OBJDIR)/%.o,$(SOURCES))

# S'assurer que proc_reader.c est inclus
ifneq ($(wildcard $(SRCDIR)/proc_reader.c),)
	OBJECTS += $(OBJDIR)/proc_reader.o
endif
TARGET = $(BINDIR)/monitoring-c

.PHONY: all clean install

all: $(TARGET)

$(TARGET): $(OBJECTS) | $(BINDIR)
	$(CC) $(OBJECTS) -o $@ $(LDFLAGS)

$(OBJDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) -I$(INCDIR) -c $< -o $@

$(OBJDIR):
	mkdir -p $(OBJDIR)

$(BINDIR):
	mkdir -p $(BINDIR)

clean:
	rm -rf $(OBJDIR) $(BINDIR)

install: $(TARGET)
	cp $(TARGET) /usr/local/bin/

.PHONY: help
help:
	@echo "Système de monitoring en C"
	@echo ""
	@echo "Usage:"
	@echo "  make          - Compiler le projet"
	@echo "  make clean    - Nettoyer les fichiers compilés"
	@echo "  make install  - Installer dans /usr/local/bin"
	@echo ""
	@echo "Exécution:"
	@echo "  ./bin/monitoring-c [interval]"
	@echo "  Exemple: ./bin/monitoring-c 15"

