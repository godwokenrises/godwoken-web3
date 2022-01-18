FROM rust:1 as builder

RUN apt-get update
RUN apt-get -y install --no-install-recommends llvm-dev clang libclang-dev libssl-dev

RUN cargo install moleculec --version 0.7.2

COPY . /godwoken-web3
RUN cd /godwoken-web3 && rustup component add rustfmt && cargo build --release

FROM ubuntu:21.04

RUN apt-get update \
 && apt-get dist-upgrade -y \
 && apt-get clean \
 && echo 'Finished installing OS updates'

# godwoken-web3 indexer
COPY --from=builder /godwoken-web3/target/release/gw-web3-indexer /bin/gw-web3-indexer

RUN mkdir -p /web3
WORKDIR /web3

CMD [ "gw-web3-indexer", "--version" ]
