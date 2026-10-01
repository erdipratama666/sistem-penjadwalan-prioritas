--
-- PostgreSQL database dump
--

\restrict TZpBIUlTl5G79gPUzkx9tSR54hdxndWHug4086KSKUbKv2xpaMAzyB0SwGbBG6p

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: Difficulty; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Difficulty" AS ENUM (
    'MUDAH',
    'SEDANG',
    'SULIT'
);


ALTER TYPE public."Difficulty" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'PEMILIK',
    'PENGELOLA_PRODUKSI'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: StatusProduksi; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StatusProduksi" AS ENUM (
    'MENUNGGU',
    'DALAM_PRODUKSI',
    'SELESAI'
);


ALTER TYPE public."StatusProduksi" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Pelanggan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pelanggan" (
    id integer NOT NULL,
    id_pelanggan character varying(10) NOT NULL,
    nama character varying(20) NOT NULL,
    alamat character varying(100) NOT NULL,
    no_hp character varying(15) NOT NULL
);


ALTER TABLE public."Pelanggan" OWNER TO postgres;

--
-- Name: Pelanggan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Pelanggan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Pelanggan_id_seq" OWNER TO postgres;

--
-- Name: Pelanggan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Pelanggan_id_seq" OWNED BY public."Pelanggan".id;


--
-- Name: Pesanan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pesanan" (
    id integer NOT NULL,
    id_pesanan character varying(10) NOT NULL,
    "pelangganId" integer NOT NULL,
    nama_produk character varying(30) NOT NULL,
    tanggal_masuk timestamp(3) without time zone NOT NULL,
    deadline timestamp(3) without time zone NOT NULL,
    jumlah integer NOT NULL,
    tingkat_kesulitan public."Difficulty" NOT NULL,
    status public."StatusProduksi" DEFAULT 'MENUNGGU'::public."StatusProduksi" NOT NULL
);


ALTER TABLE public."Pesanan" OWNER TO postgres;

--
-- Name: Pesanan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Pesanan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Pesanan_id_seq" OWNER TO postgres;

--
-- Name: Pesanan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Pesanan_id_seq" OWNED BY public."Pesanan".id;


--
-- Name: Prioritas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Prioritas" (
    id integer NOT NULL,
    id_prioritas character varying(10) NOT NULL,
    "pesananId" integer NOT NULL,
    urutan_prioritas integer NOT NULL,
    tanggal_penjadwalan timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Prioritas" OWNER TO postgres;

--
-- Name: Prioritas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Prioritas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Prioritas_id_seq" OWNER TO postgres;

--
-- Name: Prioritas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Prioritas_id_seq" OWNED BY public."Prioritas".id;


--
-- Name: Produksi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Produksi" (
    id integer NOT NULL,
    id_produksi character varying(10) NOT NULL,
    "pesananId" integer NOT NULL,
    status_produksi public."StatusProduksi" DEFAULT 'MENUNGGU'::public."StatusProduksi" NOT NULL,
    tanggal_mulai timestamp(3) without time zone,
    tanggal_selesai timestamp(3) without time zone
);


ALTER TABLE public."Produksi" OWNER TO postgres;

--
-- Name: Produksi_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Produksi_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Produksi_id_seq" OWNER TO postgres;

--
-- Name: Produksi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Produksi_id_seq" OWNED BY public."Produksi".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    id_user character varying(10) NOT NULL,
    nama character varying(20) NOT NULL,
    username character varying(20) NOT NULL,
    password character varying(100) NOT NULL,
    role public."Role" NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Pelanggan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pelanggan" ALTER COLUMN id SET DEFAULT nextval('public."Pelanggan_id_seq"'::regclass);


--
-- Name: Pesanan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pesanan" ALTER COLUMN id SET DEFAULT nextval('public."Pesanan_id_seq"'::regclass);


--
-- Name: Prioritas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prioritas" ALTER COLUMN id SET DEFAULT nextval('public."Prioritas_id_seq"'::regclass);


--
-- Name: Produksi id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Produksi" ALTER COLUMN id SET DEFAULT nextval('public."Produksi_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: Pelanggan Pelanggan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pelanggan"
    ADD CONSTRAINT "Pelanggan_pkey" PRIMARY KEY (id);


--
-- Name: Pesanan Pesanan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pesanan"
    ADD CONSTRAINT "Pesanan_pkey" PRIMARY KEY (id);


--
-- Name: Prioritas Prioritas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prioritas"
    ADD CONSTRAINT "Prioritas_pkey" PRIMARY KEY (id);


--
-- Name: Produksi Produksi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Produksi"
    ADD CONSTRAINT "Produksi_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Pelanggan_id_pelanggan_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Pelanggan_id_pelanggan_key" ON public."Pelanggan" USING btree (id_pelanggan);


--
-- Name: Pesanan_id_pesanan_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Pesanan_id_pesanan_key" ON public."Pesanan" USING btree (id_pesanan);


--
-- Name: Prioritas_id_prioritas_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Prioritas_id_prioritas_key" ON public."Prioritas" USING btree (id_prioritas);


--
-- Name: Prioritas_pesananId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Prioritas_pesananId_key" ON public."Prioritas" USING btree ("pesananId");


--
-- Name: Produksi_id_produksi_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Produksi_id_produksi_key" ON public."Produksi" USING btree (id_produksi);


--
-- Name: Produksi_pesananId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Produksi_pesananId_key" ON public."Produksi" USING btree ("pesananId");


--
-- Name: User_id_user_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_id_user_key" ON public."User" USING btree (id_user);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Pesanan Pesanan_pelangganId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Pesanan"
    ADD CONSTRAINT "Pesanan_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES public."Pelanggan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prioritas Prioritas_pesananId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prioritas"
    ADD CONSTRAINT "Prioritas_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES public."Pesanan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Produksi Produksi_pesananId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Produksi"
    ADD CONSTRAINT "Produksi_pesananId_fkey" FOREIGN KEY ("pesananId") REFERENCES public."Pesanan"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict TZpBIUlTl5G79gPUzkx9tSR54hdxndWHug4086KSKUbKv2xpaMAzyB0SwGbBG6p

